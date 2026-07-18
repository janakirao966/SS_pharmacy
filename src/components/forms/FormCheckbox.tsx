import type { InputHTMLAttributes } from 'react';

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name: string;
  checked: boolean;
  label: string;
  error?: string;
}

export default function FormCheckbox({ name, checked, label, error, className = '', ...props }: FormCheckboxProps) {
  return (
    <div className={`form-checkbox-group-wrapper ${className}`}>
      <label className="form-checkbox-group">
        <input
          type="checkbox"
          name={name}
          className="checkbox-input"
          checked={checked}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
        <span className="checkbox-label">{label}</span>
      </label>
      {error && (
        <div id={`${name}-error`} className="form-error-msg -mt-3 mb-4 block" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
