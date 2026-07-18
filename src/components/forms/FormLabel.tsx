import type { ReactNode } from 'react';

interface FormLabelProps {
  htmlFor: string;
  children: ReactNode;
}

export default function FormLabel({ htmlFor, children }: FormLabelProps) {
  return (
    <label htmlFor={htmlFor} className="form-label">
      {children}
    </label>
  );
}
