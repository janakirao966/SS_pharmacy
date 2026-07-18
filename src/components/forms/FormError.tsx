import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  id?: string;
  message?: string;
}

export default function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;
  return (
    <span
      id={id}
      className="form-error"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      role="alert"
    >
      <AlertCircle size={12} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </span>
  );
}
