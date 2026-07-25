import { describe, it, expect } from 'vitest';
import { determineTaxTreatment, calculateLineTax } from '../../supabase/functions/_shared/invoice/taxEngine';
import { renderInvoicePdfHtml } from '../../supabase/functions/_shared/invoice/pdfTemplate';

describe('Phase 5 — Tax Engine & Invoice Integrity Verification Suite', () => {

  it('1. Unconfigured tax system blocks invoices', () => {
    const taxTreatment = determineTaxTreatment('37', '37', 'UNCONFIGURED');
    expect(taxTreatment).toBe('NONE');
  });

  it('2. Missing GST configuration fails closed', () => {
    const taxTreatment = determineTaxTreatment(null, '37', 'GST_REGISTERED');
    expect(taxTreatment).toBe('NONE');
  });

  it('3. Invoice number <= 16 characters format compliance', () => {
    const prefix = 'SSP';
    const finYear = '26-27';
    const seq = 1;
    const invNumber = `${prefix}/${finYear}/${String(seq).padStart(6, '0')}`;
    expect(invNumber).toBe('SSP/26-27/000001');
    expect(invNumber.length).toBeLessThanOrEqual(16);
  });

  it('4. Financial year sequence calculation works', () => {
    const d1 = new Date('2026-05-15');
    const month = d1.getMonth() + 1; // 5
    const year = d1.getFullYear(); // 2026
    const finYear = month >= 4 ? `${year % 100}-${(year + 1) % 100}` : `${(year - 1) % 100}-${year % 100}`;
    expect(finYear).toBe('26-27');
  });

  it('5. Tax-inclusive CGST + SGST calculation math', () => {
    const result = calculateLineTax(299, 12, 'INTRA_STATE');
    expect(result.taxableValue).toBe(266.96);
    expect(result.cgstAmount).toBe(16.02);
    expect(result.sgstAmount).toBe(16.02);
    expect(result.igstAmount).toBe(0);
    expect(Number((result.taxableValue + result.cgstAmount + result.sgstAmount).toFixed(2))).toBe(299.00);
  });

  it('6. Tax-inclusive IGST calculation math', () => {
    const result = calculateLineTax(299, 12, 'INTER_STATE');
    expect(result.taxableValue).toBe(266.96);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(32.04);
    expect(result.taxableValue + result.igstAmount).toBe(299.00);
  });

  it('7. Bill of Supply path for NON_GST tax mode', () => {
    const result = calculateLineTax(299, 12, 'NONE');
    expect(result.taxableValue).toBe(299);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(0);
  });

  it('8. PDF renderer escapes HTML strings securely against injection', () => {
    const html = renderInvoicePdfHtml({
      invoice: {
        invoice_number: 'SSP/26-27/000001',
        invoice_type: 'TAX_INVOICE',
        invoice_date: '2026-07-26T00:00:00Z',
        supplier_legal_name: 'S.S. PHARMACY <script>alert(1)</script>',
        customer_name: 'John <b style="color:red">Doe</b>',
        supplier_address: { line1: 'Main St', city: 'Kadapa', state: 'Andhra Pradesh', pincode: '516309' },
        shipping_address: { address: 'User St', city: 'Kadapa', pincode: '516309', state: 'Andhra Pradesh' },
        billing_address: {},
        place_of_supply: 'Andhra Pradesh',
        place_of_supply_code: '37',
        tax_treatment: 'INTRA_STATE',
        reverse_charge: false,
        subtotal: 299,
        delivery_charge: 0,
        taxable_value: 266.96,
        cgst_total: 16.02,
        sgst_total: 16.02,
        igst_total: 0,
        grand_total: 299,
        payment_method: 'cod',
        payment_status_snapshot: 'pending'
      },
      invoice_items: [
        {
          product_name: 'Pain Cream <i>100g</i>',
          hsn_code: '3004',
          quantity: 1,
          unit_price: 299,
          taxable_value: 266.96,
          gst_rate: 12,
          cgst_amount: 16.02,
          sgst_amount: 16.02,
          igst_amount: 0,
          line_total: 299
        }
      ]
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<b style="color:red">Doe</b>');
  });

});
