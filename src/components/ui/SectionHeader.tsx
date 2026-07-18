import Badge from './Badge';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  isPageHeader?: boolean;
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
  isPageHeader = false,
}: SectionHeaderProps) {
  const alignmentClass = align === 'left' ? 'text-left' : 'section-header-centered';
  const TitleTag = isPageHeader ? 'h1' : 'h2';
  const titleClass = isPageHeader ? 'page-title' : 'section-title';
  
  return (
    <div className={`${alignmentClass} ${className}`}>
      {eyebrow && <Badge variant="eyebrow">{eyebrow}</Badge>}
      <TitleTag className={titleClass}>{title}</TitleTag>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
