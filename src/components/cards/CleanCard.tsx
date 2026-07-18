import type { HTMLAttributes, ReactNode, ElementType } from 'react';

interface CleanCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  interactive?: boolean;
  className?: string;
  innerClassName?: string; // Keep compatibility with custom padding or flex overlays if any
  as?: ElementType;
}

export default function CleanCard({
  children,
  variant = 'default',
  interactive = false,
  className = '',
  innerClassName = '',
  as: Component = 'div',
  ...props
}: CleanCardProps) {
  return (
    <Component
      className={`clean-card clean-card-${variant} ${interactive ? 'clean-card-interactive' : ''} ${className}`}
      {...props}
    >
      <div className={`clean-card-inner ${innerClassName}`}>
        {children}
      </div>
    </Component>
  );
}
