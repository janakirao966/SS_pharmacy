import type { LucideIcon } from 'lucide-react';

interface FeatureIconProps {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function FeatureIcon({
  icon: Icon,
  size = 26,
  strokeWidth = 1.8,
  className = ''
}: FeatureIconProps) {
  return (
    <span className={`feature-icon ${className}`.trim()} aria-hidden="true">
      <Icon size={size} strokeWidth={strokeWidth} />
    </span>
  );
}

export default FeatureIcon;
