import type { LucideIcon } from 'lucide-react';

interface StatItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
  className?: string;
}

export function StatItem({
  icon: Icon,
  value,
  label,
  className = ''
}: StatItemProps) {
  return (
    <div className={`stat-item ${className}`.trim()}>
      <div className="stat-item__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <div className="stat-item__text">
        <p className="stat-item__value">{value}</p>
        <p className="stat-item__label">{label}</p>
      </div>
    </div>
  );
}

export default StatItem;
