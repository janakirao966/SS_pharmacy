import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { renderInvoicePdfHtml } from "../_shared/invoice/pdfTemplate.ts"

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

    const { invoice_id } = await req.json()
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id is required' }), { status: 400, headers: corsHeaders })
    }

    // 1. Load Authoritative Invoice Snapshot from DB
    const { data: invoice, error: invErr } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice snapshot record not found' }), { status: 404, headers: corsHeaders })
    }

    const { data: invoice_items } = await supabaseClient
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice_id)

    // Mark pdf_status = generating
    await supabaseClient.from('invoices').update({ pdf_status: 'generating' }).eq('id', invoice_id)

    // 2. Render Print-Safe A4 Document
    const htmlContent = renderInvoicePdfHtml({
      invoice,
      invoice_items: invoice_items || []
    })

    // 3. Store PDF/HTML in Private Storage Bucket 'invoices'
    const storagePath = `${invoice.id}/${invoice.invoice_number.replace(/\//g, '_')}.html`

    const { error: uploadErr } = await supabaseClient
      .storage
      .from('invoices')
      .upload(storagePath, htmlContent, {
        contentType: 'text/html; charset=utf-8',
        upsert: true
      })

    if (uploadErr) {
      console.error('Storage upload failed:', uploadErr)
      await supabaseClient.from('invoices').update({ pdf_status: 'failed' }).eq('id', invoice_id)
      return new Response(JSON.stringify({ error: 'PDF storage upload failed', pdf_status: 'failed' }), { status: 500, headers: corsHeaders })
    }

    // 4. Update Invoice Record to Generated
    await supabaseClient.from('invoices').update({
      pdf_status: 'generated',
      pdf_storage_path: storagePath,
      updated_at: new Date().toISOString()
    }).eq('id', invoice_id)

    // 5. Trigger Phase 4 Notification Asynchronously (Non-blocking)
    try {
      await supabaseClient.rpc('queue_customer_notification', {
        p_order_id: invoice.order_id,
        p_event_type: 'INVOICE_ISSUED',
        p_channel: 'email'
      })
    } catch (_e) {
      // Async side effect failure doesn't roll back invoice
    }

    return new Response(JSON.stringify({
      success: true,
      invoice_id,
      pdf_status: 'generated',
      storage_path: storagePath
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('Generate invoice PDF error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
