export interface LogContext {
  service: string;
  operation: string;
  correlationId?: string;
  requestId?: string;
  orderId?: string;
}

const SENSITIVE_KEYS = [
  'password', 'jwt', 'token', 'authorization', 'secret',
  'razorpay_secret', 'service_role', 'receipt_token', 'card_number', 'cvv'
];

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export class Logger {
  private ctx: LogContext;

  constructor(ctx: LogContext) {
    this.ctx = ctx;
  }

  private formatMessage(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: this.ctx.service,
      operation: this.ctx.operation,
      correlation_id: this.ctx.correlationId || crypto.randomUUID(),
      request_id: this.ctx.requestId,
      order_id: this.ctx.orderId,
      message,
      data: sanitizeData(data)
    });
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('error', message, data));
  }
}
