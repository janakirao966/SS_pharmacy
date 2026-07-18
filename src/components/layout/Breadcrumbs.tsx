
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`breadcrumbs ${className}`}>
      <ol className="flex items-center space-x-2 text-xs font-medium text-secondary p-0 m-0" style={{ listStyle: 'none' }}>
        <li>
          <Link to="/" className="text-secondary hover:text-brand-primary transition-colors">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center space-x-2">
            <ChevronRight size={12} className="text-[#C4A35A]/60 flex-shrink-0" />
            {item.path ? (
              <Link to={item.path} className="text-secondary hover:text-brand-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-primary font-semibold" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

