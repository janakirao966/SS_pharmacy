import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DatabaseProfile {
  id: string;
  full_name: string;
  phone?: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface DatabaseOrder {
  id: string;
  order_number: string;
  user_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  payment_method: 'online_razorpay' | 'cod';
  payment_status: 'pending' | 'paid' | 'cod_pending' | 'failed' | 'refunded';
  order_status: 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  created_at: string;
}

export interface DatabaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
