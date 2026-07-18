import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'eyebrow' | 'tag' | 'status';
  className?: string;
}

export default function Badge({ children, variant = 'tag', className = '' }: BadgeProps) {
  const getBadgeClass = () => {
    switch (variant) {
      case 'eyebrow':
        return 'eyebrow-badge';
      case 'tag':
        return 'product-tag';
      case 'status':
        return 'gallery-cat-badge';
      default:
        return 'product-tag';
    }
  };

  return (
    <span className={`${getBadgeClass()} ${className}`}>
      {children}
    </span>
  );
}
