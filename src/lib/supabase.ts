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
  order_status: 'new' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  created_at: string;
}

export interface DatabaseOrderHistoryEvent {
  from_status: string | null;
  to_status: string;
  source: string;
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

export type ShipmentStatus = 'pending' | 'ready' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned' | 'cancelled';

export interface DatabaseShipment {
  id: string;
  order_id: string;
  carrier: string;
  service_name?: string;
  awb_number?: string;
  tracking_number: string;
  tracking_url?: string;
  shipment_status: ShipmentStatus;
  admin_note?: string;
  shipped_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerShipmentInfo {
  carrier: string;
  service_name?: string;
  awb_number?: string;
  tracking_number: string;
  tracking_url?: string;
  shipment_status: ShipmentStatus;
  shipped_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
}

export type RefundStatus = 'requested' | 'processing' | 'processed' | 'failed';

export interface DatabaseRefund {
  id: string;
  order_id: string;
  razorpay_payment_id: string;
  razorpay_refund_id?: string;
  amount: number;
  refund_type: 'full';
  status: RefundStatus;
  reason?: string;
  requested_by?: string;
  idempotency_key: string;
  failure_code?: string;
  failure_description?: string;
  created_at: string;
  processed_at?: string;
  updated_at: string;
}

export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'failed' | 'retry_scheduled' | 'cancelled';

export interface DatabaseNotification {
  id: string;
  order_id: string;
  user_id?: string;
  event_type: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  status: NotificationStatus;
  provider?: string;
  provider_message_id?: string;
  idempotency_key: string;
  resend_of_notification_id?: string;
  initiated_by?: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string;
  last_attempt_at?: string;
  sent_at?: string;
  failure_code?: string;
  failure_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotificationInfo {
  event_type: string;
  channel: string;
  status: NotificationStatus;
  created_at: string;
  sent_at?: string;
}

export interface CustomerRefundInfo {
  amount: number;
  status: RefundStatus;
  created_at: string;
  processed_at?: string;
}

export type TaxMode = 'UNCONFIGURED' | 'GST_REGISTERED' | 'COMPOSITION' | 'NON_GST';
export type ConfigurationStatus = 'UNCONFIGURED' | 'DRAFT' | 'VERIFIED';
export type InvoiceType = 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
export type PdfStatus = 'pending' | 'generating' | 'generated' | 'failed';

export interface DatabaseTaxSettings {
  id: string;
  tax_mode: TaxMode;
  configuration_status: ConfigurationStatus;
  legal_business_name?: string;
  trade_name?: string;
  gstin?: string;
  registered_address_line1?: string;
  registered_address_line2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  postal_code?: string;
  country?: string;
  invoice_prefix?: string;
  credit_note_prefix?: string;
  pricing_tax_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';
  default_hsn_code?: string;
  default_gst_rate?: number;
  delivery_gst_rate?: number;
  invoice_terms?: string;
  support_email?: string;
  support_phone?: string;
  verified_at?: string;
  verified_by?: string;
  updated_at: string;
}

export interface DatabaseInvoice {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  financial_year: string;
  sequence_number: number;
  invoice_date: string;
  supplier_legal_name?: string;
  supplier_trade_name?: string;
  supplier_gstin?: string;
  supplier_address: any;
  supplier_state?: string;
  supplier_state_code?: string;
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
  discount_total: number;
  delivery_charge: number;
  taxable_value: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  round_off: number;
  grand_total: number;
  currency: string;
  payment_method: string;
  payment_status_snapshot: string;
  invoice_status: 'issued' | 'credited' | 'cancelled';
  pdf_status: PdfStatus;
  pdf_storage_path?: string;
  created_at: string;
  issued_at: string;
}

export interface DatabaseInvoiceItem {
  id: string;
  invoice_id: string;
  order_item_id?: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  line_total: number;
}

export interface DatabaseInventory {
  id: string;
  product_id: string;
  sku?: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  allow_backorder: boolean;
  inventory_enabled: boolean;
  updated_at: string;
  updated_by?: string;
}

export type MovementType = 'INITIAL_STOCK' | 'MANUAL_ADJUSTMENT' | 'RESERVATION_CREATED' | 'RESERVATION_RELEASED' | 'SALE_COMMITTED' | 'CANCELLATION_RESTOCK' | 'RETURN_RESTOCK' | 'DAMAGE' | 'EXPIRED' | 'STOCK_CORRECTION';

export interface DatabaseInventoryMovement {
  id: string;
  product_id: string;
  order_id?: string;
  order_item_id?: string;
  movement_type: MovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  reference?: string;
  created_by?: string;
  created_at: string;
}

export interface DatabaseInventoryReservation {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  status: 'active' | 'committed' | 'released' | 'expired';
  expires_at: string;
  created_at: string;
  committed_at?: string;
  released_at?: string;
}

export type ReturnStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'pickup_scheduled' | 'in_transit' | 'received' | 'inspection' | 'inspection_completed' | 'refund_pending' | 'completed' | 'cancelled';
export type InventoryDisposition = 'pending_inspection' | 'restock' | 'damaged' | 'expired' | 'quarantine' | 'discard';

export interface DatabaseReturn {
  id: string;
  return_number: string;
  order_id: string;
  user_id?: string;
  status: ReturnStatus;
  resolution: 'refund' | 'replacement';
  reason_code: string;
  customer_reason: string;
  admin_note?: string;
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  received_at?: string;
  inspected_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  product_id: string;
  quantity: number;
  reason_code: string;
  condition_status?: string;
  inspection_note?: string;
  inventory_disposition: InventoryDisposition;
  unit_price_snapshot: number;
  refund_eligible_amount: number;
  created_at: string;
}

export interface DatabaseReturnShipment {
  id: string;
  return_id: string;
  carrier: string;
  tracking_number: string;
  tracking_url?: string;
  pickup_scheduled_at?: string;
  pickup_completed_at?: string;
  received_at?: string;
  created_at: string;
}

export interface DatabaseRTO {
  id: string;
  order_id: string;
  shipment_id?: string;
  rto_reason: string;
  rto_carrier: string;
  rto_tracking_number: string;
  rto_status: 'rto_initiated' | 'rto_in_transit' | 'rto_received' | 'rto_inspected' | 'rto_completed';
  rto_initiated_at: string;
  rto_received_at?: string;
  created_at: string;
}

export interface DatabaseCODPayout {
  id: string;
  return_id: string;
  order_id: string;
  payout_method: 'BANK_TRANSFER' | 'UPI';
  beneficiary_name: string;
  account_number_last4?: string;
  ifsc_code?: string;
  upi_id?: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference_number?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export type ExceptionSeverity = 'info' | 'warning' | 'high' | 'critical';
export type ExceptionStatus = 'open' | 'investigating' | 'resolved' | 'ignored';

export interface DatabaseOperationalException {
  id: string;
  exception_type: string;
  severity: ExceptionSeverity;
  entity_type: string;
  entity_id?: string;
  order_id?: string;
  orders?: {
    order_number: string;
  };
  title: string;
  description?: string;
  status: ExceptionStatus;
  source?: string;
  error_code?: string;
  fingerprint: string;
  metadata?: Record<string, any>;
  first_detected_at: string;
  last_detected_at: string;
  occurrence_count: number;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'queued' | 'processing' | 'retry_scheduled' | 'completed' | 'failed' | 'cancelled';

export interface DatabaseBackgroundJob {
  id: string;
  job_type: string;
  entity_type: string;
  entity_id?: string;
  order_id?: string;
  status: JobStatus;
  priority: number;
  payload?: Record<string, any>;
  idempotency_key?: string;
  attempt_count: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  last_error_code?: string;
  last_error_message?: string;
  locked_at?: string;
  locked_by?: string;
  correlation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseWebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  signature_verified: boolean;
  processing_status: 'received' | 'queued' | 'processed' | 'failed' | 'ignored';
  attempt_count: number;
  received_at: string;
  processed_at?: string;
  last_error?: string;
  correlation_id?: string;
  created_at: string;
}

export interface DatabaseHealthCheck {
  id: string;
  component: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  last_check_at: string;
  latency_ms?: number;
  details?: Record<string, any>;
}

export type TicketCategory = 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'RETURN' | 'REFUND' | 'PRODUCT' | 'DAMAGED_PRODUCT' | 'WRONG_PRODUCT' | 'MISSING_ITEM' | 'QUALITY_CONCERN' | 'SAFETY_CONCERN' | 'ACCOUNT' | 'INVOICE' | 'GENERAL' | 'OTHER';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'assigned' | 'waiting_for_customer' | 'waiting_for_internal' | 'resolved' | 'closed';

export interface DatabaseSupportTicket {
  id: string;
  ticket_number: string;
  user_id?: string;
  order_id?: string;
  product_id?: string;
  return_id?: string;
  refund_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: 'customer_account' | 'guest_tracking' | 'contact_form' | 'admin' | 'system';
  assigned_to?: string;
  requires_safety_review: boolean;
  first_response_at?: string;
  first_response_due_at?: string;
  resolution_due_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'admin' | 'system';
  sender_user_id?: string;
  message: string;
  visibility: 'customer' | 'internal';
  created_at: string;
}

export interface DatabaseSupportAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string;
  created_at: string;
}

export interface DatabaseSupportStatusHistory {
  id: string;
  ticket_id: string;
  from_status: string;
  to_status: string;
  changed_by?: string;
  source: string;
  note?: string;
  created_at: string;
}

export interface DatabaseManufacturer {
  id: string;
  code: string;
  name: string;
  drug_license_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface DatabaseSupplier {
  id: string;
  supplier_code: string;
  legal_name: string;
  trade_name?: string;
  gstin?: string;
  drug_license_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive' | 'blocked';
  payment_terms?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInventoryBatch {
  id: string;
  product_id: string;
  supplier_id?: string;
  manufacturer_id?: string;
  goods_receipt_item_id?: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  mrp: number;
  unit_cost: number;
  quantity_received: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  status: 'quarantine' | 'sellable' | 'blocked' | 'recalled' | 'expired' | 'depleted' | 'damaged';
  quality_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface DatabaseProductRecall {
  id: string;
  recall_number: string;
  product_id: string;
  recall_type: 'product' | 'batch';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  reason: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  initiated_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseExecutiveKPIs {
  gross_sales: number;
  net_sales: number;
  historical_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  orders_count: number;
  average_order_value: number;
  expired_stock_loss: number;
  open_exceptions_count: number;
  query_start_date: string;
  query_end_date: string;
}

export interface DatabaseGSTReportRow {
  report_month: string;
  place_of_supply: string;
  hsn_code: string;
  gst_rate: number;
  total_quantity: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_invoice_value: number;
}

export interface DatabaseReportExport {
  id: string;
  requested_by: string;
  report_type: string;
  format: 'csv' | 'json';
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  storage_path?: string;
  row_count: number;
  file_size_bytes: number;
  created_at: string;
}

export interface DatabaseSecurityEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  actor_user_id?: string;
  endpoint?: string;
  entity_type?: string;
  entity_id?: string;
  ip_hash?: string;
  user_agent_summary?: string;
  correlation_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DatabasePrivacyDeletionRequest {
  id: string;
  user_id: string;
  status: 'REQUESTED' | 'IDENTITY_VERIFIED' | 'RETENTION_CHECK' | 'ANONYMIZATION_PENDING' | 'ANONYMIZED' | 'AUTH_ACCOUNT_REMOVED';
  retention_notes?: string;
  created_at: string;
  updated_at: string;
}
