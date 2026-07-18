import type { SelectHTMLAttributes } from 'react';
import FormError from './FormError';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: FormSelectOption[];
  error?: string;
}

export default function FormSelect({ id, label, options, error, className = '', required, ...props }: FormSelectProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="text-[#B91C1C] font-bold ml-1" aria-hidden="true">*</span>}
      </label>
      <select
        id={id}
        className={`form-select ${error ? 'error' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        {...props}
      >
        <option value="" disabled hidden>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FormError id={`${id}-error`} message={error} />
    </div>
  );
}
