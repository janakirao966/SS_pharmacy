import type { LucideIcon } from 'lucide-react';

interface SectionEyebrowProps {
  icon?: LucideIcon;
  text: string;
  className?: string;
}

export function SectionEyebrow({
  icon: Icon,
  text,
  className = ''
}: SectionEyebrowProps) {
  return (
    <div className={`eyebrow-badge ${className}`.trim()}>
      {Icon && <Icon size={16} strokeWidth={2} aria-hidden="true" className="eyebrow-badge__icon" />}
      <span>{text}</span>
    </div>
  );
}

export default SectionEyebrow;
