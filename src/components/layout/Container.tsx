import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}

export default function Container({ children, className = '', size = 'default' }: ContainerProps) {
  const getWidthClass = () => {
    switch (size) {
      case 'narrow':
        return 'max-w-4xl';
      case 'wide':
        return 'max-w-[1600px]';
      case 'default':
      default:
        return 'max-w-7xl';
    }
  };

  return (
    <div className={`container mx-auto px-4 ${getWidthClass()} ${className}`}>
      {children}
    </div>
  );
}
