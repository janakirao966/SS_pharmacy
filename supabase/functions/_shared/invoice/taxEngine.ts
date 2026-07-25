export type TaxTreatment = 'INTRA_STATE' | 'INTER_STATE' | 'NONE';
export type TaxMode = 'UNCONFIGURED' | 'GST_REGISTERED' | 'COMPOSITION' | 'NON_GST';

export interface TaxCalculationResult {
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  lineTotal: number;
}

export function determineTaxTreatment(supplierStateCode: string | null, placeOfSupplyCode: string | null, taxMode: TaxMode): TaxTreatment {
  if (taxMode !== 'GST_REGISTERED' || !supplierStateCode || !placeOfSupplyCode) {
    return 'NONE';
  }
  return supplierStateCode === placeOfSupplyCode ? 'INTRA_STATE' : 'INTER_STATE';
}

export function calculateLineTax(totalPrice: number, gstRate: number, taxTreatment: TaxTreatment): TaxCalculationResult {
  if (taxTreatment === 'NONE' || gstRate <= 0) {
    return {
      taxableValue: Number(totalPrice.toFixed(2)),
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      lineTotal: Number(totalPrice.toFixed(2))
    };
  }

  // Tax-inclusive pricing math
  const taxableValue = Number((totalPrice / (1 + (gstRate / 100))).toFixed(2));
  const totalTax = Number((totalPrice - taxableValue).toFixed(2));

  if (taxTreatment === 'INTRA_STATE') {
    const halfRate = gstRate / 2;
    const cgstAmount = Number((totalTax / 2).toFixed(2));
    const sgstAmount = Number((totalTax - cgstAmount).toFixed(2));

    return {
      taxableValue,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      lineTotal: Number(totalPrice.toFixed(2))
    };
  }

  // INTER_STATE IGST
  return {
    taxableValue,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: gstRate,
    igstAmount: totalTax,
    lineTotal: Number(totalPrice.toFixed(2))
  };
}
