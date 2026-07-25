import { escapeHtml, renderEmailLayout } from './layout.ts';

export interface EmailPayloadData {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    shipping_address: string;
    city: string;
    pincode: string;
    subtotal: number;
    delivery_charge: number;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
  };
  order_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  shipment?: {
    carrier: string;
    service_name?: string;
    tracking_number: string;
    tracking_url?: string;
    shipped_at?: string;
    delivered_at?: string;
  };
  refund?: {
    amount: number;
    status: string;
    razorpay_refund_id?: string;
    processed_at?: string;
  };
}

export function generateEventEmail(eventType: string, data: EmailPayloadData): { subject: string; html: string; text: string } {
  const { order, order_items = [], shipment, refund } = data;
  const name = escapeHtml(order.customer_name);
  const orderNum = escapeHtml(order.order_number);

  let subject = `S.S. Pharmacy Update for Order #${orderNum}`;
  let bodyHtml = '';
  let text = '';

  switch (eventType) {
    case 'ORDER_PLACED':
      subject = `Order Placed - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Order Received!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for choosing S.S. PHARMACY. We have received your order <strong>#${orderNum}</strong> and are preparing it for processing.</p>
        <div class="card">
          <p style="margin: 0; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: bold;">Order Summary</p>
          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #1D3A28;">Total Amount: ₹${order.total_amount}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #4B5563;">Payment Method: ${escapeHtml(order.payment_method.toUpperCase().replace('_', ' '))}</p>
        </div>
        <h3>Item Breakdown</h3>
        <table class="table">
          <thead>
            <tr><th>Product</th><th style="text-align: center;">Qty</th><th class="price">Total</th></tr>
          </thead>
          <tbody>
            ${order_items.map(item => `
              <tr>
                <td>${escapeHtml(item.product_name)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td class="price">₹${item.total_price}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p><strong>Shipping Address:</strong><br />${escapeHtml(order.shipping_address)}, ${escapeHtml(order.city)} - ${escapeHtml(order.pincode)}</p>
      `;
      text = `Dear ${order.customer_name}, thank you for your order #${order.order_number} totaling ₹${order.total_amount}. We are preparing it for processing.`;
      break;

    case 'ORDER_CONFIRMED':
      subject = `Order Confirmed - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Order Confirmed</h2>
        <p>Dear ${name},</p>
        <p>Your order <strong>#${orderNum}</strong> has been officially confirmed by S.S. PHARMACY team.</p>
      `;
      text = `Dear ${order.customer_name}, your order #${order.order_number} has been confirmed.`;
      break;

    case 'ORDER_PROCESSING':
      subject = `Order Processing - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Order Processing</h2>
        <p>Dear ${name},</p>
        <p>Your Ayurvedic medicines for order <strong>#${orderNum}</strong> are now being formulated and packed at our licensed facility.</p>
      `;
      text = `Dear ${order.customer_name}, your order #${order.order_number} is now being processed.`;
      break;

    case 'ORDER_PACKED':
      subject = `Order Packed & Ready - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Order Packed</h2>
        <p>Dear ${name},</p>
        <p>Your package for order <strong>#${orderNum}</strong> has been securely packed and is ready for courier dispatch.</p>
      `;
      text = `Dear ${order.customer_name}, order #${order.order_number} has been packed and is ready for dispatch.`;
      break;

    case 'ORDER_SHIPPED':
      subject = `Package Dispatched - S.S. PHARMACY #${orderNum}`;
      const carrier = shipment ? escapeHtml(shipment.carrier) : 'Courier Service';
      const trackingNo = shipment ? escapeHtml(shipment.tracking_number) : 'Available Soon';
      const trackingUrl = (shipment && shipment.tracking_url && shipment.tracking_url.startsWith('https://')) ? shipment.tracking_url : null;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Your Package Has Been Dispatched!</h2>
        <p>Dear ${name},</p>
        <p>Great news! Order <strong>#${orderNum}</strong> has been handed over to courier service for delivery.</p>
        <div class="card">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: bold;">Shipment Information</p>
          <p style="margin: 4px 0;"><strong>Carrier:</strong> ${carrier}</p>
          <p style="margin: 4px 0;"><strong>Tracking Number:</strong> ${trackingNo}</p>
          ${trackingUrl ? `<p style="margin-top: 12px;"><a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" class="btn">Track Your Package</a></p>` : ''}
        </div>
      `;
      text = `Dear ${order.customer_name}, order #${order.order_number} has been shipped via ${shipment?.carrier || 'Courier'}. Tracking Number: ${shipment?.tracking_number || 'N/A'}.`;
      break;

    case 'ORDER_OUT_FOR_DELIVERY':
      subject = `Out for Delivery - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Out for Delivery Today</h2>
        <p>Dear ${name},</p>
        <p>Your package for order <strong>#${orderNum}</strong> is out for delivery today. Please ensure someone is available at the delivery address.</p>
      `;
      text = `Dear ${order.customer_name}, order #${order.order_number} is out for delivery today.`;
      break;

    case 'ORDER_DELIVERED':
      subject = `Order Delivered - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Package Delivered!</h2>
        <p>Dear ${name},</p>
        <p>Your order <strong>#${orderNum}</strong> has been delivered. Thank you for placing your trust in S.S. PHARMACY.</p>
      `;
      text = `Dear ${order.customer_name}, your order #${order.order_number} has been delivered. Thank you!`;
      break;

    case 'ORDER_CANCELLED':
      subject = `Order Cancelled - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #991B1B; margin-top: 0;">Order Cancelled</h2>
        <p>Dear ${name},</p>
        <p>Your order <strong>#${orderNum}</strong> has been cancelled.</p>
        <p>${order.payment_status === 'paid' ? 'Since this order was paid online, a full refund request has been initiated.' : 'No payment refund is required for Cash on Delivery/Unpaid orders.'}</p>
      `;
      text = `Dear ${order.customer_name}, order #${order.order_number} has been cancelled.`;
      break;

    case 'PAYMENT_SUCCESSFUL':
      subject = `Payment Confirmed - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Online Payment Verified</h2>
        <p>Dear ${name},</p>
        <p>Payment of <strong>₹${order.total_amount}</strong> for order <strong>#${orderNum}</strong> has been verified successfully via Razorpay.</p>
      `;
      text = `Dear ${order.customer_name}, payment of ₹${order.total_amount} for order #${order.order_number} has been verified.`;
      break;

    case 'PAYMENT_FAILED':
      subject = `Payment Action Required - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #991B1B; margin-top: 0;">Payment Failure Notice</h2>
        <p>Dear ${name},</p>
        <p>Online payment transaction for order <strong>#${orderNum}</strong> could not be verified. Please retry or contact support.</p>
      `;
      text = `Dear ${order.customer_name}, payment for order #${order.order_number} failed. Please contact support.`;
      break;

    case 'REFUND_REQUESTED':
      subject = `Refund Requested - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Refund Requested</h2>
        <p>Dear ${name},</p>
        <p>A full refund request of <strong>₹${refund ? refund.amount : order.total_amount}</strong> for order <strong>#${orderNum}</strong> has been initiated.</p>
      `;
      text = `Dear ${order.customer_name}, a full refund request for order #${order.order_number} has been created.`;
      break;

    case 'REFUND_PROCESSING':
      subject = `Refund Processing - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Refund Processing</h2>
        <p>Dear ${name},</p>
        <p>Your refund of <strong>₹${refund ? refund.amount : order.total_amount}</strong> for order <strong>#${orderNum}</strong> is currently being processed by Razorpay and your bank.</p>
      `;
      text = `Dear ${order.customer_name}, your refund for order #${order.order_number} is processing.`;
      break;

    case 'REFUND_PROCESSED':
      subject = `Refund Processed - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #1D3A28; margin-top: 0;">Refund Credit Completed</h2>
        <p>Dear ${name},</p>
        <p>Your full refund of <strong>₹${refund ? refund.amount : order.total_amount}</strong> for order <strong>#${orderNum}</strong> has been successfully processed via Razorpay. It will reflect in your account as per your bank timelines.</p>
      `;
      text = `Dear ${order.customer_name}, full refund of ₹${order.total_amount} for order #${order.order_number} has been processed via Razorpay.`;
      break;

    case 'REFUND_FAILED':
      subject = `Refund Attention Required - S.S. PHARMACY #${orderNum}`;
      bodyHtml = `
        <h2 style="color: #991B1B; margin-top: 0;">Refund Processing Issue</h2>
        <p>Dear ${name},</p>
        <p>An issue occurred while processing your refund for order <strong>#${orderNum}</strong>. Our finance team is reviewing this and will contact you shortly.</p>
      `;
      text = `Dear ${order.customer_name}, there was an issue processing your refund for order #${order.order_number}. Our team is attending to it.`;
      break;
  }

  return {
    subject,
    html: renderEmailLayout(subject, bodyHtml),
    text
  };
}
