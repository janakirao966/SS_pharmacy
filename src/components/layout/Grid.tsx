import type { ReactNode } from 'react';

interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 12;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  isBento?: boolean;
}

export default function Grid({ children, cols = 3, gap = 'md', className = '', isBento = false }: GridProps) {
  const getColClass = () => {
    if (isBento) return 'bento-grid';
    switch (cols) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 12: return 'grid-cols-12';
      default: return 'grid-cols-1 md:grid-cols-3';
    }
  };

  const getGapClass = () => {
    switch (gap) {
      case 'sm': return 'gap-4';
      case 'lg': return 'gap-8';
      case 'md':
      default:
        return 'gap-6';
    }
  };

  return (
    <div className={`grid ${getColClass()} ${getGapClass()} ${className}`}>
      {children}
    </div>
  );
}
