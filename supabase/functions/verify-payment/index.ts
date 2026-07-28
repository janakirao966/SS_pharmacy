import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment validation identifiers')
    }

    // 1. Fetch matching local order to establish binding and verify details
    const { data: order, error: fetchError } = await supabaseClient
      .from('orders')
      .select('id, user_id, payment_status, order_number')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()

    if (fetchError || !order) {
      throw new Error(`Order binding not found for Razorpay Order ID: ${razorpay_order_id}`)
    }

    // 2. Enforce Ownership Protection (Authorization check)
    if (order.user_id !== null) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Authorization credentials required to verify this order')
      }
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user || user.id !== order.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Cannot verify payment for another customer\'s order' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3. Cryptographically Verify Signature (DO NOT trust payment_status = paid before verifying)
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(text))
    const signatureArray = Array.from(new Uint8Array(signatureBuffer))
    const computedSignature = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("")

    if (computedSignature !== razorpay_signature) {
      throw new Error('Payment signature verification failed')
    }

    // 4. Idempotency Check (If already marked paid, return success without double-committing stock)
    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ success: true, order_number: order.order_number, already_processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Update Order status to Paid
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id,
        razorpay_signature
      })
      .eq('id', order.id)

    if (updateError) {
      throw new Error(`Order database update failed: ${updateError.message}`)
    }

    // 6. Commit inventory stock for the order (Idempotency protected)
    const { error: rpcError } = await supabaseClient.rpc('commit_order_stock', { p_order_id: order.id })
    if (rpcError) {
      throw new Error(`Inventory stock commitment failed: ${rpcError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, order_number: order.order_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
