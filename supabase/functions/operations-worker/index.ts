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

  const workerId = `worker_${crypto.randomUUID().substring(0, 8)}`
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID()
  const logger = new Logger({ service: 'operations-worker', operation: 'process_jobs', correlationId })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Claim pending jobs atomically using FOR UPDATE SKIP LOCKED
    const { data: jobs, error: claimErr } = await supabaseClient.rpc('claim_background_jobs', {
      p_worker_id: workerId,
      p_batch_size: 5
    })

    if (claimErr) {
      logger.error('Failed to claim background jobs', { error: claimErr.message })
      return new Response(JSON.stringify({ error: claimErr.message }), { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No queued jobs to claim', claimed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    logger.info(`Worker ${workerId} claimed ${jobs.length} jobs`, { count: jobs.length })
    const results = []

    // 2. Process claimed jobs out-of-band
    for (const job of jobs) {
      try {
        if (job.job_type === 'expire_reservations') {
          await supabaseClient.rpc('expire_inventory_reservations')
          await supabaseClient.rpc('complete_background_job', { p_job_id: job.id })
          results.push({ id: job.id, status: 'completed' })
        } else if (job.job_type === 'reconcile_all') {
          await supabaseClient.rpc('reconcile_payment_state')
          await supabaseClient.rpc('reconcile_refund_state_suite')
          await supabaseClient.rpc('reconcile_order_state')
          await supabaseClient.rpc('reconcile_shipment_state')
          await supabaseClient.rpc('reconcile_notification_state')
          await supabaseClient.rpc('reconcile_inventory_state')
          await supabaseClient.rpc('reconcile_invoice_state')
          await supabaseClient.rpc('reconcile_return_rto_state')
          await supabaseClient.rpc('complete_background_job', { p_job_id: job.id })
          results.push({ id: job.id, status: 'completed' })
        } else if (job.job_type === 'recover_stale') {
          await supabaseClient.rpc('recover_stale_jobs')
          await supabaseClient.rpc('complete_background_job', { p_job_id: job.id })
          results.push({ id: job.id, status: 'completed' })
        } else {
          // Default completion for generic payload tasks
          await supabaseClient.rpc('complete_background_job', { p_job_id: job.id })
          results.push({ id: job.id, status: 'completed' })
        }
      } catch (err: any) {
        logger.error(`Job processing error for job ${job.id}`, { error: err.message })
        await supabaseClient.rpc('fail_background_job', {
          p_job_id: job.id,
          p_error_code: 'WORKER_EXC',
          p_error_message: err.message
        })
        results.push({ id: job.id, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({ workerId, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    logger.error('Worker crash exception', { error: err.message })
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
