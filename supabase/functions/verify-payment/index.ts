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

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

    // 1. Verify Razorpay Payment Signature
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

    // 2. Signature verified, update order status in DB
    const { data: order, error } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id,
        razorpay_signature
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select('id, order_number')
      .single()

    if (error || !order) {
      throw new Error(`Order database update failed: ${error?.message || 'Order not found'}`)
    }

    // 3. Commit reserved inventory stock for paid order
    await supabaseClient.rpc('commit_order_stock', { p_order_id: order.id });

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
