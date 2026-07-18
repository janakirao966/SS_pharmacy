import type { ReactNode } from 'react';

interface IconWrapperProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function IconWrapper({ children, size = 'md', className = '' }: IconWrapperProps) {
  const sizeClass = size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon-md';
  return (
    <div className={`icon-container ${sizeClass} ${className}`}>
      {children}
    </div>
  );
}
