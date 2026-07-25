import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/logger.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID()
  const logger = new Logger({
    service: 'razorpay-webhook',
    operation: 'handle_webhook',
    correlationId
  })

  try {
    const signature = req.headers.get('x-razorpay-signature')
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''

    if (!signature || !webhookSecret) {
      logger.warn('Unauthorized webhook request: Missing signature or secret')
      return new Response('Unauthorized: Missing signature or webhook secret', { status: 401 })
    }

    const rawBody = await req.text()

    // 1. Verify Razorpay webhook signature using Web Crypto HMAC SHA-256
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
    const signatureArray = Array.from(new Uint8Array(signatureBuffer))
    const computedSignature = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("")

    if (computedSignature.length !== signature.length) {
      return new Response('Unauthorized: Invalid signature length', { status: 401 })
    }

    let match = true
    for (let i = 0; i < computedSignature.length; i++) {
      if (computedSignature[i] !== signature[i]) {
        match = false
      }
    }

    if (!match) {
      logger.warn('Signature mismatch for Razorpay webhook')
      return new Response('Unauthorized: Signature mismatch', { status: 401 })
    }

    // 2. Parse payload & Extract Event Identity
    const payload = JSON.parse(rawBody)
    const eventType = payload.event || 'unknown'
    const eventId = payload.event_id || payload.account_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Persist Event to Webhook Ledger (Deduplication)
    const { data: webEvent, error: webErr } = await supabaseClient
      .from('webhook_events')
      .insert({
        provider: 'razorpay',
        event_id: eventId,
        event_type: eventType,
        payload: payload,
        signature_verified: true,
        processing_status: 'queued',
        correlation_id: correlationId
      })
      .select()
      .maybeSingle()

    if (webErr && webErr.code === '23505') {
      logger.info('Duplicate webhook event received, skipping duplicate execution', { eventId, eventType })
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Queue Background Job for Asynchronous Processing
    await supabaseClient.from('background_jobs').insert({
      job_type: 'process_webhook',
      entity_type: 'webhook_event',
      idempotency_key: `web_job_${eventId}`,
      payload: { provider: 'razorpay', event_id: eventId, event_type: eventType, payload },
      correlation_id: correlationId
    })

    // 5. Execute Immediate Business Logic Inline for Fast Settlement
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const rzpOrderId = payload.payload?.payment?.entity?.order_id
      const rzpPaymentId = payload.payload?.payment?.entity?.id

      if (rzpOrderId) {
        await supabaseClient
          .from('orders')
          .update({ payment_status: 'paid', razorpay_payment_id: rzpPaymentId })
          .eq('razorpay_order_id', rzpOrderId)

        await supabaseClient.rpc('commit_order_stock_by_rzp', { p_rzp_order_id: rzpOrderId })
        logger.info('Payment captured & stock committed', { rzpOrderId, rzpPaymentId })
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = payload.payload?.refund?.entity
      if (refundEntity) {
        const rzpPaymentId = refundEntity.payment_id
        const rzpRefundId = refundEntity.id

        const { data: refund } = await supabaseClient
          .from('refunds')
          .select('order_id, status')
          .eq('razorpay_payment_id', rzpPaymentId)
          .maybeSingle()

        if (refund && refund.status !== 'processed') {
          await supabaseClient.rpc('reconcile_refund_state', {
            p_order_id: refund.order_id,
            p_razorpay_refund_id: rzpRefundId,
            p_new_status: 'processed'
          })
          logger.info('Refund processed webhook reconciled', { orderId: refund.order_id })
        }
      }
    }

    // Update Webhook Event Status to Processed
    if (webEvent?.id) {
      await supabaseClient
        .from('webhook_events')
        .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webEvent.id)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    logger.error('Webhook processing exception', { error: err.message })
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
