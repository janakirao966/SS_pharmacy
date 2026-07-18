import type { ReactNode } from 'react';
import CleanCard from './CleanCard';

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function InfoCard({ icon, title, children, className = '' }: InfoCardProps) {
  return (
    <CleanCard variant="default" className={className} innerClassName="info-item-card">
      <div className="info-icon-box">
        {icon}
      </div>
      <div className="info-details-box mt-4">
        <h4>{title}</h4>
        <div className="info-text mt-2">{children}</div>
      </div>
    </CleanCard>
  );
}
