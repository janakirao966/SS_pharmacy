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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify Admin caller identity
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: corsHeaders })
    }

    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), { status: 400, headers: corsHeaders })
    }

    // 1. Fetch Order details authoritatively
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    if (order.payment_method !== 'online_razorpay' || !order.razorpay_payment_id) {
      return new Response(JSON.stringify({ error: 'Order was not paid online via Razorpay' }), { status: 400, headers: corsHeaders })
    }

    // 2. Fetch or create refund record
    let { data: refund, error: refundError } = await supabaseClient
      .from('refunds')
      .select('*')
      .eq('order_id', order_id)
      .single()

    if (!refund) {
      const { data: newRefund, error: createError } = await supabaseClient
        .from('refunds')
        .insert({
          order_id,
          razorpay_payment_id: order.razorpay_payment_id,
          amount: order.total_amount,
          refund_type: 'full',
          status: 'requested',
          requested_by: user.id
        })
        .select('*')
        .single()

      if (createError) {
        return new Response(JSON.stringify({ error: 'Failed to create refund record' }), { status: 500, headers: corsHeaders })
      }
      refund = newRefund
    }

    if (refund.status === 'processed') {
      return new Response(JSON.stringify({ success: true, message: 'Refund already processed', refund }), { headers: corsHeaders })
    }

    // Server-authoritative amount in Paise
    const amountInPaise = Math.round(Number(order.total_amount) * 100)
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

    // Update status to processing
    await supabaseClient
      .from('refunds')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', refund.id)

    // 3. Call Razorpay Refund API with X-Refund-Idempotency header
    const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        'Content-Type': 'application/json',
        'X-Refund-Idempotency': refund.idempotency_key
      },
      body: JSON.stringify({
        amount: amountInPaise,
        speed: 'normal',
        notes: {
          order_id: order.id,
          order_number: order.order_number
        }
      })
    })

    const rzpData = await rzpResponse.json()

    // 4. Handle HTTP 409 Concurrent Idempotency Conflict
    if (rzpResponse.status === 409) {
      console.warn(`Razorpay idempotency conflict (HTTP 409) for order ${order_id}`)
      return new Response(JSON.stringify({
        success: true,
        message: 'Concurrent refund request in progress',
        status: 'processing'
      }), { headers: corsHeaders })
    }

    if (!rzpResponse.ok) {
      const failureCode = rzpData.error?.code || 'RAZORPAY_API_ERROR'
      const failureDesc = rzpData.error?.description || 'Razorpay refund submission failed'

      await supabaseClient.rpc('reconcile_refund_state', {
        p_order_id: order_id,
        p_razorpay_refund_id: null,
        p_new_status: 'failed',
        p_failure_code: failureCode,
        p_failure_description: failureDesc
      })

      return new Response(JSON.stringify({ error: failureDesc, failure_code: failureCode }), { status: 400, headers: corsHeaders })
    }

    // 5. Map actual response status (pending, processed, failed)
    const rzpStatus = rzpData.status // 'pending' | 'processed' | 'failed'
    const razorpayRefundId = rzpData.id

    if (rzpStatus === 'processed') {
      await supabaseClient.rpc('reconcile_refund_state', {
        p_order_id: order_id,
        p_razorpay_refund_id: razorpayRefundId,
        p_new_status: 'processed'
      })
    } else if (rzpStatus === 'failed') {
      await supabaseClient.rpc('reconcile_refund_state', {
        p_order_id: order_id,
        p_razorpay_refund_id: razorpayRefundId,
        p_new_status: 'failed',
        p_failure_code: rzpData.error_code || 'REFUND_FAILED',
        p_failure_description: rzpData.error_description || 'Refund failed at bank level'
      })
    } else {
      // Pending / Processing state
      await supabaseClient.rpc('reconcile_refund_state', {
        p_order_id: order_id,
        p_razorpay_refund_id: razorpayRefundId,
        p_new_status: 'processing'
      })
    }

    return new Response(JSON.stringify({
      success: true,
      razorpay_refund_id: razorpayRefundId,
      refund_status: rzpStatus === 'processed' ? 'processed' : 'processing'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('Process refund error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
