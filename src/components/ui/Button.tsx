import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  rounded = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'outline':
        return 'btn-outline';
      case 'ghost':
        return 'btn-ghost';
      default:
        return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm';
      case 'md':
        return 'btn-md';
      case 'lg':
        return 'btn-lg';
      default:
        return 'btn-md';
    }
  };

  const getRoundedClass = () => {
    switch (rounded) {
      case 'sm':
        return 'btn-rounded-sm';
      case 'md':
        return 'btn-rounded-md';
      case 'lg':
        return 'btn-rounded-lg';
      case 'full':
        return 'btn-rounded-full';
      default:
        return 'btn-rounded-md';
    }
  };

  return (
    <button
      className={`btn ${getVariantClass()} ${getSizeClass()} ${getRoundedClass()} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={16} className="text-current" />}
      <span>{children}</span>
    </button>
  );
}
