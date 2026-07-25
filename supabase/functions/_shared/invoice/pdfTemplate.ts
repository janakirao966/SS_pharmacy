import { escapeHtml } from "../email/layout.ts";

export interface InvoicePdfData {
  invoice: {
    invoice_number: string;
    invoice_type: string;
    invoice_date: string;
    supplier_legal_name?: string;
    supplier_trade_name?: string;
    supplier_gstin?: string;
    supplier_address: any;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    customer_gstin?: string;
    billing_address: any;
    shipping_address: any;
    place_of_supply: string;
    place_of_supply_code: string;
    tax_treatment: string;
    reverse_charge: boolean;
    subtotal: number;
    delivery_charge: number;
    taxable_value: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    grand_total: number;
    payment_method: string;
    payment_status_snapshot: string;
  };
  invoice_items: Array<{
    product_name: string;
    hsn_code?: string;
    quantity: number;
    unit_price: number;
    taxable_value: number;
    gst_rate: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    line_total: number;
  }>;
}

export function renderInvoicePdfHtml(data: InvoicePdfData): string {
  const { invoice, invoice_items } = data;
  const isTaxInv = invoice.invoice_type === 'TAX_INVOICE';
  const title = isTaxInv ? 'TAX INVOICE' : 'BILL OF SUPPLY';

  const suppName = escapeHtml(invoice.supplier_legal_name || invoice.supplier_trade_name || 'S.S. PHARMACY');
  const suppGstin = escapeHtml(invoice.supplier_gstin || 'N/A');
  const suppAddr = invoice.supplier_address || {};
  const suppAddrStr = escapeHtml(`${suppAddr.line1 || ''} ${suppAddr.line2 || ''}, ${suppAddr.city || ''}, ${suppAddr.state || ''} - ${suppAddr.pincode || ''}`);

  const custName = escapeHtml(invoice.customer_name);
  const custAddr = invoice.shipping_address || {};
  const custAddrStr = escapeHtml(`${custAddr.address || ''}, ${custAddr.city || ''} - ${custAddr.pincode || ''} (${custAddr.state || ''})`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(invoice.invoice_number)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; background: #FFF; }
    .header { border-bottom: 2px solid #1D3A28; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-title { color: #1D3A28; font-size: 20px; font-weight: bold; margin: 0; }
    .company-sub { color: #8A6B29; font-size: 10px; text-transform: uppercase; font-weight: bold; }
    .doc-type { text-align: right; }
    .doc-type h2 { margin: 0; color: #1D3A28; font-size: 18px; text-transform: uppercase; }
    .doc-type p { margin: 2px 0 0 0; font-size: 12px; font-weight: bold; font-family: monospace; }
    .grid-2 { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .box { flex: 1; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px; background: #FAF8F5; }
    .box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6B7280; margin-bottom: 6px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
    .table th { background: #1D3A28; color: #FFF; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
    .table td { border-bottom: 1px solid #E5E7EB; padding: 8px; }
    .num { text-align: right; font-family: monospace; }
    .summary { width: 250px; margin-left: auto; margin-top: 20px; font-size: 11px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #F3F4F6; }
    .summary-row.total { font-size: 14px; font-weight: bold; color: #1D3A28; border-top: 2px solid #1D3A28; border-bottom: none; padding-top: 8px; }
    .footer { margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 10px; color: #6B7280; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="company-title">${suppName}</h1>
      <div class="company-sub">Authentic Ayurvedic Medicines • Mfg Lic: R-1970/Ayur</div>
      <div style="font-size: 11px; color: #4B5563; margin-top: 4px;">${suppAddrStr}</div>
      ${isTaxInv ? `<div style="font-size: 11px; font-weight: bold;">GSTIN: ${suppGstin}</div>` : ''}
    </div>
    <div class="doc-type">
      <h2>${title}</h2>
      <p># ${escapeHtml(invoice.invoice_number)}</p>
      <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <div class="box-title">Billed & Shipped To</div>
      <div style="font-weight: bold; font-size: 13px; color: #1D3A28;">${custName}</div>
      <div>${custAddrStr}</div>
      <div style="margin-top: 4px; font-family: monospace;">Phone: ${escapeHtml(invoice.customer_phone || 'N/A')}</div>
      ${invoice.customer_gstin ? `<div style="font-weight: bold; margin-top: 4px;">Customer GSTIN: ${escapeHtml(invoice.customer_gstin)}</div>` : ''}
    </div>
    <div class="box">
      <div class="box-title">Supply & Payment Metadata</div>
      <div><strong>Place of Supply:</strong> ${escapeHtml(invoice.place_of_supply)} (${escapeHtml(invoice.place_of_supply_code)})</div>
      <div><strong>Tax Treatment:</strong> ${escapeHtml(invoice.tax_treatment)}</div>
      <div><strong>Payment Method:</strong> ${escapeHtml(invoice.payment_method.toUpperCase().replace('_', ' '))}</div>
      <div><strong>Payment Status:</strong> ${escapeHtml(invoice.payment_status_snapshot.toUpperCase())}</div>
      <div><strong>Reverse Charge:</strong> ${invoice.reverse_charge ? 'Yes' : 'No'}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Item Description</th>
        <th>HSN</th>
        <th className="num">Qty</th>
        <th className="num">Unit Price</th>
        <th className="num">Taxable Value</th>
        ${isTaxInv ? `<th className="num">CGST</th><th className="num">SGST</th><th className="num">IGST</th>` : ''}
        <th className="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice_items.map(item => `
        <tr>
          <td><strong>${escapeHtml(item.product_name)}</strong></td>
          <td style="font-family: monospace;">${escapeHtml(item.hsn_code || '3004')}</td>
          <td className="num">${item.quantity}</td>
          <td className="num">₹${item.unit_price}</td>
          <td className="num">₹${item.taxable_value}</td>
          ${isTaxInv ? `
            <td className="num">₹${item.cgst_amount}</td>
            <td className="num">₹${item.sgst_amount}</td>
            <td className="num">₹${item.igst_amount}</td>
          ` : ''}
          <td className="num" style="font-weight: bold;">₹${item.line_total}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span>Items Subtotal:</span><span className="num">₹${invoice.subtotal}</span></div>
    <div class="summary-row"><span>Delivery Charge:</span><span className="num">₹${invoice.delivery_charge}</span></div>
    <div class="summary-row"><span>Taxable Value:</span><span className="num">₹${invoice.taxable_value}</span></div>
    ${isTaxInv && invoice.cgst_total > 0 ? `<div class="summary-row"><span>CGST Total:</span><span className="num">₹${invoice.cgst_total}</span></div>` : ''}
    ${isTaxInv && invoice.sgst_total > 0 ? `<div class="summary-row"><span>SGST Total:</span><span className="num">₹${invoice.sgst_total}</span></div>` : ''}
    ${isTaxInv && invoice.igst_total > 0 ? `<div class="summary-row"><span>IGST Total:</span><span className="num">₹${invoice.igst_total}</span></div>` : ''}
    <div class="summary-row total"><span>Grand Total:</span><span className="num">₹${invoice.grand_total}</span></div>
  </div>

  <div class="footer">
    <p>This is a computer-generated financial document. Signature not required.</p>
    <p>S.S. PHARMACY • High-Quality Ayurvedic Formulations • Contact: support@sspharmacy.in</p>
  </div>
</body>
</html>`;
}
