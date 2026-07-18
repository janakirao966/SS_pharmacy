import type { TextareaHTMLAttributes } from 'react';
import FormError from './FormError';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
}

export default function FormTextarea({ id, label, error, className = '', required, ...props }: FormTextareaProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="text-[#B91C1C] font-bold ml-1" aria-hidden="true">*</span>}
      </label>
      <textarea
        id={id}
        className={`form-textarea ${error ? 'error' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        {...props}
      ></textarea>
      <FormError id={`${id}-error`} message={error} />
    </div>
  );
}
