import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CaretLeft, 
  CaretRight, 
  MagnifyingGlass, 
  WarningCircle, 
  Eye
} from '@phosphor-icons/react';

// ==========================================
// 1. ADMIN CARD (SINGLE-SHELL)
// ==========================================
interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  topAccent?: boolean;
  accentColor?: string;
}

export function AdminCard({ 
  children, 
  className = '', 
  topAccent = false,
  accentColor = '#000000'
}: AdminCardProps) {
  const style = topAccent ? { borderTop: `4px solid ${accentColor}` } : undefined;
  return (
    <div 
      className={`admin-card ${className} ${topAccent ? 'has-accent' : ''}`}
      style={style}
    >
      {children}
    </div>
  );
}

// ==========================================
// 2. ADMIN STAT CARD
// ==========================================
interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  actionUrl?: string;
  actionLabel?: string;
}

export function AdminStatCard({
  label,
  value,
  subtext,
  icon,
  actionUrl,
  actionLabel
}: AdminStatCardProps) {
  const CardContent = (
    <div className="admin-stat-card-body">
      <div className="admin-stat-card-header">
        <span className="admin-stat-card-label">{label}</span>
        <div className="admin-stat-card-icon">{icon}</div>
      </div>
      <div className="admin-stat-card-value font-mono">{value}</div>
      {subtext && <p className="admin-stat-card-subtext">{subtext}</p>}
      {actionUrl && actionLabel && (
        <span className="admin-stat-card-action">
          {actionLabel} <ArrowRight size={12} weight="bold" />
        </span>
      )}
    </div>
  );

  return (
    <AdminCard className="admin-stat-card">
      {actionUrl ? (
        <Link to={actionUrl} className="admin-stat-card-link">
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}
    </AdminCard>
  );
}

// ==========================================
// 3. ADMIN STATUS BADGE
// ==========================================
interface AdminStatusBadgeProps {
  status: string;
  type?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

export function AdminStatusBadge({ status, type }: AdminStatusBadgeProps) {
  let inferredType: 'success' | 'warning' | 'danger' | 'neutral' | 'info' = type || 'neutral';
  
  if (!type) {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'paid' || s === 'resolved' || s === 'approved' || s === 'delivered' || s === 'completed' || s === 'published') {
      inferredType = 'success';
    } else if (s === 'draft' || s === 'pending' || s === 'cod_pending' || s === 'under_review' || s === 'preparing' || s === 'investigating' || s === 'issued') {
      inferredType = 'warning';
    } else if (s === 'failed' || s === 'cancelled' || s === 'rejected' || s === 'critical') {
      inferredType = 'danger';
    } else if (s === 'archived' || s === 'contacted' || s === 'in_transit') {
      inferredType = 'info';
    }
  }

  return (
    <span className={`admin-status-badge badge-${inferredType}`}>
      <span className="badge-dot" />
      <span className="badge-text">{status.replace('_', ' ')}</span>
    </span>
  );
}

// ==========================================
// 4. ADMIN DATA TABLE (DESKTOP)
// ==========================================
interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick
}: AdminDataTableProps<T>) {
  return (
    <div className="admin-table-container overflow-x-auto">
      <table className="admin-data-table min-w-full text-xs">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={onRowClick ? 'clickable-row' : ''}
            >
              {columns.map((col, idx) => (
                <td key={idx} className={col.className}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// 5. ADMIN MOBILE RECORD
// ==========================================
interface AdminMobileRecordProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actionUrl?: string;
  onClick?: () => void;
}

export function AdminMobileRecord({
  title,
  subtitle,
  meta,
  badge,
  actionUrl,
  onClick
}: AdminMobileRecordProps) {
  const CardContent = (
    <div className="admin-mobile-record-body space-y-2 p-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="font-semibold text-xs text-[var(--admin-text-primary)] m-0">{title}</h4>
          {subtitle && <p className="text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)] m-0 mt-0.5">{subtitle}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-[#f4f4f0] text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)]">
        <div>{meta}</div>
        <Eye size={14} className="text-[var(--admin-text-secondary)]" />
      </div>
    </div>
  );

  return (
    <AdminCard className="p-0 overflow-hidden">
      {actionUrl ? (
        <Link to={actionUrl} className="block hover:bg-[var(--admin-surface-subtle)]">
          {CardContent}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className="block text-left w-full hover:bg-[var(--admin-surface-subtle)]">
          {CardContent}
        </button>
      ) : (
        CardContent
      )}
    </AdminCard>
  );
}

// ==========================================
// 6. ADMIN FILTER BAR
// ==========================================
interface FilterOption {
  label: string;
  value: string;
}

interface AdminFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  selectedFilter: string;
  onFilterChange: (value: string) => void;
  filterOptions: FilterOption[];
  filterLabel?: string;
}

export function AdminFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectedFilter,
  onFilterChange,
  filterOptions,
  filterLabel = 'Status'
}: AdminFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="admin-search-input-box relative flex-1 max-w-md">
        <MagnifyingGlass className="absolute left-3 top-3.5 text-[var(--admin-text-secondary)] pointer-events-none" size={15} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full !pl-9 pr-3 py-2 border border-[var(--admin-border)] rounded-lg text-xs min-h-[44px]"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <span className="font-semibold text-[var(--admin-text-secondary)] shrink-0">{filterLabel}:</span>
        <select
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="p-2 border border-[var(--admin-border)] rounded-lg text-xs bg-[var(--admin-surface)] font-semibold text-[var(--admin-text-primary)] min-h-[44px]"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ==========================================
// 7. ADMIN PAGINATION
// ==========================================
interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onPageChange
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2">
      <p className="text-[var(--admin-text-secondary)] m-0">
        Showing <span className="font-mono font-semibold text-[var(--admin-text-primary)]">{startRecord}</span> to <span className="font-mono font-semibold text-[var(--admin-text-primary)]">{endRecord}</span> of <span className="font-mono font-semibold text-[var(--admin-text-primary)]">{totalRecords}</span> entries
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="admin-btn-secondary !p-2 !min-h-[36px] disabled:opacity-40"
          aria-label="Previous page"
        >
          <CaretLeft size={14} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              currentPage === page
                ? 'bg-[var(--admin-primary-accent)] text-[#ffffff]'
                : 'bg-[var(--admin-surface-subtle)] text-[var(--admin-text-secondary)] hover:bg-[#e4e4e7]'
            }`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="admin-btn-secondary !p-2 !min-h-[36px] disabled:opacity-40"
          aria-label="Next page"
        >
          <CaretRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 8. ADMIN FORM PRIMITIVES (44px TOUCH TARGETS)
// ==========================================
interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function AdminInput({ label, helperText, error, className = '', ...props }: AdminInputProps) {
  return (
    <div className="space-y-1 text-xs">
      {label && <label className="block font-semibold text-[var(--admin-text-primary)]">{label} {props.required && <span className="text-[var(--admin-status-danger-text)]">*</span>}</label>}
      <input
        {...props}
        className={`w-full p-2.5 border rounded-lg text-xs min-h-[44px] ${
          error ? 'border-[#dc2626] bg-[var(--admin-surface-subtle)]' : 'border-[var(--admin-border)] bg-[var(--admin-surface)]'
        } ${className}`}
      />
      {error ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-status-danger-text)] font-semibold m-0">{error}</p>
      ) : helperText ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)] m-0">{helperText}</p>
      ) : null}
    </div>
  );
}

interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export function AdminSelect({ label, helperText, error, options, className = '', ...props }: AdminSelectProps) {
  return (
    <div className="space-y-1 text-xs">
      {label && <label className="block font-semibold text-[var(--admin-text-primary)]">{label} {props.required && <span className="text-[var(--admin-status-danger-text)]">*</span>}</label>}
      <select
        {...props}
        className={`w-full p-2.5 border rounded-lg text-xs min-h-[44px] bg-[var(--admin-surface)] font-semibold text-[var(--admin-text-primary)] ${
          error ? 'border-[#dc2626]' : 'border-[var(--admin-border)]'
        } ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-status-danger-text)] font-semibold m-0">{error}</p>
      ) : helperText ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)] m-0">{helperText}</p>
      ) : null}
    </div>
  );
}

interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function AdminTextarea({ label, helperText, error, className = '', ...props }: AdminTextareaProps) {
  return (
    <div className="space-y-1 text-xs">
      {label && <label className="block font-semibold text-[var(--admin-text-primary)]">{label} {props.required && <span className="text-[var(--admin-status-danger-text)]">*</span>}</label>}
      <textarea
        {...props}
        className={`w-full p-2.5 border rounded-lg text-xs ${
          error ? 'border-[#dc2626] bg-[var(--admin-surface-subtle)]' : 'border-[var(--admin-border)] bg-[var(--admin-surface)]'
        } ${className}`}
      />
      {error ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-status-danger-text)] font-semibold m-0">{error}</p>
      ) : helperText ? (
        <p className="text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)] m-0">{helperText}</p>
      ) : null}
    </div>
  );
}

// ==========================================
// 9. ADMIN SKELETON
// ==========================================
interface AdminSkeletonProps {
  type?: 'card' | 'table' | 'line' | 'kpi';
  rows?: number;
}

export function AdminSkeleton({ type = 'line', rows = 3 }: AdminSkeletonProps) {
  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="p-4 bg-[var(--admin-surface-subtle)] rounded-xl animate-pulse space-y-2">
            <div className="h-3 w-24 bg-[#e4e4e7] rounded" />
            <div className="h-6 w-16 bg-[#e4e4e7] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="p-5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl animate-pulse space-y-3">
        <div className="h-4 w-40 bg-[var(--admin-surface-subtle)] rounded" />
        <div className="h-3 w-64 bg-[var(--admin-surface-subtle)] rounded" />
        <div className="h-20 w-full bg-[var(--admin-surface-subtle)] rounded mt-2" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl overflow-hidden">
        <div className="h-10 bg-[var(--admin-surface-subtle)] border-b border-[var(--admin-border)]" />
        <div className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-[#f4f4f0] last:border-0">
              <div className="h-3 w-28 bg-[var(--admin-surface-subtle)] rounded" />
              <div className="h-3 w-36 bg-[var(--admin-surface-subtle)] rounded" />
              <div className="h-3 w-20 bg-[var(--admin-surface-subtle)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-3 w-full bg-[var(--admin-surface-subtle)] rounded animate-pulse" />
      ))}
    </div>
  );
}

// ==========================================
// 10. ADMIN EMPTY STATE
// ==========================================
interface AdminEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export function AdminEmptyState({
  title,
  description,
  actionLabel,
  onActionClick
}: AdminEmptyStateProps) {
  return (
    <AdminCard className="text-center py-10">
      <WarningCircle size={40} className="text-[var(--admin-text-secondary)] mx-auto mb-2" weight="light" />
      <h3 className="font-bold text-xs text-[var(--admin-text-primary)] m-0">{title}</h3>
      <p className="text-xs text-[var(--admin-text-secondary)] max-w-sm mx-auto mt-1 m-0">{description}</p>
      {actionLabel && onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="admin-btn-primary mt-4"
        >
          {actionLabel}
        </button>
      )}
    </AdminCard>
  );
}

// ==========================================
// 11. ADMIN QUICK ACTION
// ==========================================
interface AdminQuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  url?: string;
  onClick?: () => void;
}

export function AdminQuickAction({
  title,
  description,
  icon,
  url,
  onClick
}: AdminQuickActionProps) {
  const ActionContent = (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#ccfbf1] text-[var(--admin-primary-accent)] rounded-lg shrink-0 flex items-center justify-center">{icon}</div>
        <div>
          <h4 className="font-semibold text-xs text-[var(--admin-text-primary)] m-0">{title}</h4>
          <p className="text-[var(--admin-font-xs)] text-[var(--admin-text-secondary)] m-0 mt-0.5">{description}</p>
        </div>
      </div>
      <ArrowRight size={14} className="text-[var(--admin-primary-accent)] shrink-0" weight="bold" />
    </div>
  );

  return (
    <AdminCard className="p-0 overflow-hidden hover:border-[#14b8a6] hover:bg-[#f0fdfa] transition-all">
      {url ? (
        <Link to={url} className="block">
          {ActionContent}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className="block text-left w-full">
          {ActionContent}
        </button>
      )}
    </AdminCard>
  );
}

// ==========================================
// 12. ADMIN ATTENTION ITEM
// ==========================================
interface AdminAttentionItemProps {
  label: string;
  actionUrl: string;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function AdminAttentionItem({
  label,
  actionUrl,
  badgeText,
  badgeType = 'warning'
}: AdminAttentionItemProps) {
  return (
    <Link to={actionUrl} className="flex items-center justify-between p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[#14b8a6] hover:bg-[#f0fdfa] text-xs transition-all">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--admin-text-primary)]">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badgeText && (
          <AdminStatusBadge status={badgeText} type={badgeType} />
        )}
        <ArrowRight className="text-[var(--admin-text-secondary)]" size={14} weight="bold" />
      </div>
    </Link>
  );
}

// ==========================================
// 13. PREVIEW MODE BADGE
// ==========================================
export function PreviewModeBadge() {
  return (
    <span className="bg-[var(--admin-surface-subtle)] text-[var(--admin-text-secondary)] text-[var(--admin-font-xs)] font-mono font-semibold px-2 py-0.5 rounded uppercase" title="Local Preview Mode">
      Preview Mode
    </span>
  );
}
