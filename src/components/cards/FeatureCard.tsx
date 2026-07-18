import type { ReactNode } from 'react';
import CleanCard from './CleanCard';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <CleanCard variant="default" className={className} innerClassName="seal-card">
      <div className="seal-icon">
        {icon}
      </div>
      <div>
        <h5>{title}</h5>
        <p className="mt-1">{description}</p>
      </div>
    </CleanCard>
  );
}
