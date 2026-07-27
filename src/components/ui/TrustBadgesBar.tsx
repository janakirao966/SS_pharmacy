import { Award, Factory, Sparkles, CheckCircle2, Shield } from 'lucide-react';

interface TrustBadgesBarProps {
  className?: string;
}

export default function TrustBadgesBar({ className = '' }: TrustBadgesBarProps) {
  const items = [
    {
      icon: Award,
      title: "GMP Certified",
      subtitle: "Audited Facility",
      pill: null
    },
    {
      icon: Factory,
      title: "Govt. License",
      subtitle: null,
      pill: "R-1970/Ayur"
    },
    {
      icon: Sparkles,
      title: "100% Herbal",
      subtitle: "Pure Botanicals",
      pill: null
    },
    {
      icon: CheckCircle2,
      title: "Tested Safety",
      subtitle: "Lab Validated",
      pill: null
    },
    {
      icon: Shield,
      title: "Zero Harm",
      subtitle: "Non-Toxic Formula",
      pill: null
    }
  ];

  return (
    <div
      className={`trust-badges-bar-wrap ${className}`}
      role="region"
      aria-label="S.S. PHARMACY Verified Quality & Statutory Credentials"
    >
      {items.map((item, index) => {
        const Icon = item.icon;

        return (
          <div key={index} className="trust-badge-card-item">
            {/* Icon Box */}
            <div className="trust-badge-icon-box-wrap">
              <Icon size={20} className="trust-badge-icon" aria-hidden="true" />
            </div>

            {/* Text Block */}
            <div className="trust-badge-text-box">
              <h4 className="trust-badge-card-title">
                {item.title}
              </h4>
              {item.pill ? (
                <span className="trust-badge-card-pill">
                  {item.pill}
                </span>
              ) : (
                <span className="trust-badge-card-sub">
                  {item.subtitle}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

