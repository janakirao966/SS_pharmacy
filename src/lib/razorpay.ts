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
