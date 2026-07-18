import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const styles = {
    width,
    height,
    ...style,
  };

  const variantClass = `skeleton-${variant}`;

  return (
    <div
      className={`skeleton-base ${variantClass} ${className}`}
      style={styles}
      {...props}
    />
  );
}
