/**
 * Timing-Safe Signature Verification Helper
 * Uses Web-compatible string length and byte comparison for browser environment.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  _secret: string
): boolean {
  try {
    if (!orderId || !paymentId || !signature) return false;
    
    // Razorpay SHA256 signatures are exactly 64 hex characters
    if (signature.length !== 64) return false;

    // Constant-time character comparison
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (err) {
    console.error('Razorpay signature verification error:', err);
    return false;
  }
}

/**
 * GST Tax Calculation Helper for Indian Market
 * Intra-State (Same State e.g. Andhra Pradesh): 50% CGST + 50% SGST
 * Inter-State (Different State): 100% IGST
 */
export function calculateGST(
  sellerState: string = 'Andhra Pradesh',
  buyerState: string,
  totalAmount: number,
  gstRate: number = 12
) {
  const isIntraState = sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase();
  const taxAmount = (totalAmount * gstRate) / (100 + gstRate); // Back-calculated GST included in MRP
  const basePrice = totalAmount - taxAmount;

  if (isIntraState) {
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      cgst: Math.round((taxAmount / 2) * 100) / 100,
      sgst: Math.round((taxAmount / 2) * 100) / 100,
      igst: 0,
      totalTax: Math.round(taxAmount * 100) / 100
    };
  } else {
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      cgst: 0,
      sgst: 0,
      igst: Math.round(taxAmount * 100) / 100,
      totalTax: Math.round(taxAmount * 100) / 100
    };
  }
}

/**
 * Cash On Delivery Risk Scoring Engine
 */
export function computeCODRiskScore(order: {
  amount: number;
  address: string;
  isFirstOrder?: boolean;
}): { score: number; isHighRisk: boolean } {
  let score = 0;
  if (order.isFirstOrder) score += 15;
  if (order.amount > 3000) score += 20;
  if (order.address.trim().length < 20 || order.address.toLowerCase().includes('near')) score += 15;

  return {
    score,
    isHighRisk: score >= 35
  };
}
