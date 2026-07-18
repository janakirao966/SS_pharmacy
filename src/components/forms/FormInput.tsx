import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import FormError from './FormError';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  success?: boolean;
}

export default function FormInput({ id, label, error, success, className = '', required, ...props }: FormInputProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="text-[#B91C1C] font-bold ml-1" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`form-input ${error ? 'error' : ''} ${success ? 'success pr-10' : ''} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
          {...props}
        />
        {success && !error && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 flex items-center" style={{ pointerEvents: 'none', zIndex: 5 }}>
            <Check size={16} strokeWidth={3} />
          </span>
        )}
      </div>
      <FormError id={`${id}-error`} message={error} />
    </div>
  );
}
