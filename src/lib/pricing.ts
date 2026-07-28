import type { CartItem } from '../context/CartContext';

/**
 * Shared Ecommerce Pricing Engine for S.S. Pharmacy.
 * Enforces unified pricing math across CartDrawer, Checkout page, and Order successes.
 */

export const SHIPPING_THRESHOLD = 999;
export const SHIPPING_CHARGE = 50;

/**
 * Calculates order subtotal based on product selling prices.
 */
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + ((item.product.sellingPrice ?? item.product.mrp ?? 0) * item.quantity), 0);
}

/**
 * Calculates delivery fee: FREE if subtotal is >= SHIPPING_THRESHOLD, else SHIPPING_CHARGE.
 */
export function calculateDelivery(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
}

/**
 * Calculates simulated taxes. Tax is inclusive in the MRP for S.S. Pharmacy,
 * so this returns 0.
 */
export function calculateTax(_subtotal: number): number {
  return 0; // Inclusive in MRP
}

/**
 * Calculates final order total.
 */
export function calculateOrderTotal(subtotal: number, deliveryCharge: number): number {
  return subtotal + deliveryCharge;
}
