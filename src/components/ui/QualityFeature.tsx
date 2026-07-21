import type { LucideIcon } from 'lucide-react';

interface QualityFeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function QualityFeature({
  icon: Icon,
  title,
  description,
  className = ''
}: QualityFeatureProps) {
  return (
    <div className={`quality-feature ${className}`.trim()}>
      <span className="quality-feature__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.8} />
      </span>

      <div className="quality-feature__content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default QualityFeature;
