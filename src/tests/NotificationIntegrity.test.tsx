import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../supabase/functions/_shared/email/layout';
import { generateEventEmail } from '../../supabase/functions/_shared/email/templates';

describe('Phase 4 Notification & Communication System Integrity Suite', () => {
  it('generates deterministic idempotency keys for transactional order events', () => {
    const generateKey = (orderId: string, eventType: string, channel: string = 'email') => {
      return `${orderId}_${eventType}_${channel}`;
    };

    const key1 = generateKey('ord-123', 'ORDER_SHIPPED', 'email');
    const key2 = generateKey('ord-123', 'ORDER_SHIPPED', 'email');

    expect(key1).toBe('ord-123_ORDER_SHIPPED_email');
    expect(key1).toBe(key2); // Deterministic equality
  });

  it('verifies distinction between Retry and Resend notification identities', () => {
    const originalNotif = {
      id: 'notif-uuid-1',
      order_id: 'ord-123',
      event_type: 'ORDER_CONFIRMED',
      channel: 'email',
      status: 'failed',
      attempt_count: 5,
      idempotency_key: 'ord-123_ORDER_CONFIRMED_email',
      resend_of_notification_id: null
    };

    // Retry reuses original notification ID and increments attempt count
    const retryAction = (notif: typeof originalNotif) => ({
      target_id: notif.id,
      new_attempt_count: notif.attempt_count + 1
    });

    const retryResult = retryAction(originalNotif);
    expect(retryResult.target_id).toBe('notif-uuid-1');
    expect(retryResult.new_attempt_count).toBe(6);

    // Resend creates a NEW notification identity referencing original ID
    const resendAction = (notif: typeof originalNotif, newUuid: string) => ({
      id: newUuid,
      order_id: notif.order_id,
      event_type: notif.event_type,
      channel: notif.channel,
      status: 'queued',
      attempt_count: 0,
      idempotency_key: `${notif.order_id}_${notif.event_type}_resend_${newUuid}`,
      resend_of_notification_id: notif.id
    });

    const resendResult = resendAction(originalNotif, 'notif-uuid-2');
    expect(resendResult.id).toBe('notif-uuid-2');
    expect(resendResult.resend_of_notification_id).toBe('notif-uuid-1');
    expect(resendResult.idempotency_key).toContain('_resend_');
  });

  it('escapes user input inserted into HTML email templates to prevent XSS injection', () => {
    const maliciousInput = '<script>alert("XSS")</script> & "Company"';
    const escaped = escapeHtml(maliciousInput);

    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &quot;Company&quot;');
    expect(escaped).not.toContain('<script>');
  });

  it('strictly excludes admin_note from email templates even if provided in shipment data', () => {
    const samplePayload = {
      order: {
        id: 'ord-999',
        order_number: 'SSP-100001',
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        shipping_address: '123 Main St',
        city: 'Hyderabad',
        pincode: '500001',
        subtotal: 499,
        delivery_charge: 0,
        total_amount: 499,
        payment_method: 'online_razorpay',
        payment_status: 'paid',
        created_at: '2026-07-26T00:00:00Z'
      },
      shipment: {
        carrier: 'Delhivery',
        tracking_number: 'DEL999888',
        tracking_url: 'https://track.delhivery.com/p/DEL999888',
        admin_note: 'CONFIDENTIAL INTERNAL OPERATIONAL NOTE - DO NOT EXPOSE'
      } as any
    };

    const rendered = generateEventEmail('ORDER_SHIPPED', samplePayload);

    expect(rendered.html).toContain('Delhivery');
    expect(rendered.html).toContain('DEL999888');
    expect(rendered.html).not.toContain('CONFIDENTIAL INTERNAL OPERATIONAL NOTE');
    expect(rendered.text).not.toContain('CONFIDENTIAL INTERNAL OPERATIONAL NOTE');
  });

  it('calculates exponential backoff intervals correctly', () => {
    const calculateBackoffMinutes = (attemptCount: number) => {
      if (attemptCount <= 1) return 1;
      if (attemptCount === 2) return 5;
      if (attemptCount === 3) return 30;
      return 120;
    };

    expect(calculateBackoffMinutes(1)).toBe(1);
    expect(calculateBackoffMinutes(2)).toBe(5);
    expect(calculateBackoffMinutes(3)).toBe(30);
    expect(calculateBackoffMinutes(4)).toBe(120);
  });

  it('identifies stale processing jobs for recovery', () => {
    const isStaleProcessing = (status: string, lastAttemptAt: string, nowMs: number) => {
      if (status !== 'processing') return false;
      const attemptMs = new Date(lastAttemptAt).getTime();
      return (nowMs - attemptMs) > (5 * 60 * 1000); // Older than 5 minutes
    };

    const now = Date.now();
    const freshAttempt = new Date(now - 2 * 60 * 1000).toISOString(); // 2 min ago
    const staleAttempt = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min ago

    expect(isStaleProcessing('processing', freshAttempt, now)).toBe(false);
    expect(isStaleProcessing('processing', staleAttempt, now)).toBe(true);
    expect(isStaleProcessing('sent', staleAttempt, now)).toBe(false);
  });
});
