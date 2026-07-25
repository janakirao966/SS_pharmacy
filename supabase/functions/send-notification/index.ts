import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateEventEmail } from "../_shared/email/templates.ts"

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

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'orders@sspharmacy.in'
    const fromName = Deno.env.get('NOTIFICATION_FROM_NAME') || 'S.S. PHARMACY'

    let targetNotificationId: string | null = null
    try {
      const body = await req.json()
      targetNotificationId = body.notification_id || null
    } catch (_e) {
      // Body optional
    }

    // 1. Stale Job Recovery & Candidate Selection
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    let query = supabaseClient.from('customer_notifications').select('*')

    if (targetNotificationId) {
      query = query.eq('id', targetNotificationId)
    } else {
      // Claim queued, retry_scheduled, or stale processing jobs (> 5 min)
      query = query.or(`status.in.(queued,retry_scheduled),and(status.eq.processing,last_attempt_at.lt.${fiveMinutesAgo})`)
        .limit(10)
    }

    const { data: candidates, error: candidateErr } = await query
    if (candidateErr) throw candidateErr

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: 'No eligible notifications to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const notif of candidates) {
      // 2. Atomic Claim Operation
      const { data: claimedNotif, error: claimErr } = await supabaseClient
        .from('customer_notifications')
        .update({
          status: 'processing',
          last_attempt_at: new Date().toISOString(),
          attempt_count: notif.attempt_count + 1
        })
        .eq('id', notif.id)
        .in('status', ['queued', 'retry_scheduled', 'processing'])
        .select('*')
        .single()

      if (claimErr || !claimedNotif) {
        console.warn(`Atomic claim skipped for notification: ${notif.id}`)
        continue
      }

      // 3. Load Authoritative Order & Context
      const { data: order } = await supabaseClient.from('orders').select('*').eq('id', notif.order_id).single()
      const { data: order_items } = await supabaseClient.from('order_items').select('*').eq('order_id', notif.order_id)
      const { data: shipment } = await supabaseClient.from('shipments').select('*').eq('order_id', notif.order_id).maybeSingle()
      const { data: refund } = await supabaseClient.from('refunds').select('*').eq('order_id', notif.order_id).maybeSingle()

      if (!order) {
        await supabaseClient.from('customer_notifications').update({
          status: 'failed',
          failure_code: 'ORDER_NOT_FOUND',
          failure_message: 'Associated order record no longer exists'
        }).eq('id', notif.id)
        continue
      }

      // 4. Generate Email Payload
      const { subject, html, text } = generateEventEmail(notif.event_type, {
        order,
        order_items: order_items || [],
        shipment: shipment || undefined,
        refund: refund || undefined
      })

      // 5. Send Email via Resend or Dev Fallback
      if (resendApiKey) {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [notif.recipient],
            subject,
            html,
            text
          })
        })

        const resendData = await resendRes.json()

        if (resendRes.ok && resendData.id) {
          await supabaseClient.from('customer_notifications').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: resendData.id,
            updated_at: new Date().toISOString()
          }).eq('id', notif.id)

          results.push({ id: notif.id, status: 'sent', message_id: resendData.id })
        } else {
          // Calculate Exponential Backoff
          const attempts = claimedNotif.attempt_count
          let delayMinutes = 1
          if (attempts === 2) delayMinutes = 5
          else if (attempts === 3) delayMinutes = 30
          else if (attempts >= 4) delayMinutes = 120

          const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
          const isExhausted = attempts >= claimedNotif.max_attempts

          await supabaseClient.from('customer_notifications').update({
            status: isExhausted ? 'failed' : 'retry_scheduled',
            next_retry_at: isExhausted ? null : nextRetryAt,
            failure_code: resendData.name || 'PROVIDER_ERROR',
            failure_message: resendData.message || 'Resend delivery failed',
            updated_at: new Date().toISOString()
          }).eq('id', notif.id)

          results.push({ id: notif.id, status: isExhausted ? 'failed' : 'retry_scheduled', error: resendData.message })
        }
      } else {
        // Dev Simulated Mode
        console.log(`[DEV SIMULATED EMAIL SENT] To: ${notif.recipient} | Event: ${notif.event_type} | Subject: ${subject}`)
        await supabaseClient.from('customer_notifications').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: `dev-sim-${Date.now()}`,
          updated_at: new Date().toISOString()
        }).eq('id', notif.id)

        results.push({ id: notif.id, status: 'sent', mode: 'simulated' })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Send notification worker error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
