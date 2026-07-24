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
  accentColor = '#2D5016'
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
  // Infer status type if not provided
  let inferredType: 'success' | 'warning' | 'danger' | 'neutral' | 'info' = type || 'neutral';
  
  if (!type) {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'paid' || s === 'resolved' || s === 'approved' || s === 'delivered') {
      inferredType = 'success';
    } else if (s === 'draft' || s === 'pending' || s === 'cod_pending' || s === 'under_review' || s === 'preparing') {
      inferredType = 'warning';
    } else if (s === 'failed' || s === 'cancelled' || s === 'rejected') {
      inferredType = 'danger';
    } else if (s === 'archived' || s === 'contacted') {
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
    <div className="admin-table-container">
      <table className="admin-data-table">
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
// 5. ADMIN MOBILE RECORD (MOBILE REPLACEMENT FOR TABLES)
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
    <div className="admin-mobile-record-body">
      <div className="admin-mobile-record-header">
        <div className="admin-mobile-record-title-box">
          <h4 className="admin-mobile-record-title">{title}</h4>
          {subtitle && <p className="admin-mobile-record-subtitle">{subtitle}</p>}
        </div>
        {badge && <div className="admin-mobile-record-badge">{badge}</div>}
      </div>
      <div className="admin-mobile-record-footer">
        <div className="admin-mobile-record-meta">{meta}</div>
        <div className="admin-mobile-record-arrow">
          <Eye size={16} />
        </div>
      </div>
    </div>
  );

  return (
    <AdminCard className="admin-mobile-record">
      {actionUrl ? (
        <Link to={actionUrl} className="admin-mobile-record-link">
          {CardContent}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className="admin-mobile-record-button text-left w-full">
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
    <div className="admin-filter-bar">
      <div className="admin-search-box">
        <MagnifyingGlass className="admin-search-icon" size={16} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="admin-search-input"
        />
      </div>

      <div className="admin-filter-select-box">
        <span className="admin-filter-label">{filterLabel}:</span>
        <select
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="admin-filter-select"
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
    <div className="admin-pagination-container">
      <p className="admin-pagination-info">
        Showing <span className="font-mono">{startRecord}</span> to <span className="font-mono">{endRecord}</span> of <span className="font-mono">{totalRecords}</span> entries
      </p>

      <div className="admin-pagination-buttons">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="admin-page-btn"
          aria-label="Previous page"
        >
          <CaretLeft size={16} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`admin-page-btn-number ${currentPage === page ? 'active' : ''}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="admin-page-btn"
          aria-label="Next page"
        >
          <CaretRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 8. ADMIN SKELETON
// ==========================================
interface AdminSkeletonProps {
  type?: 'card' | 'table' | 'line' | 'kpi';
  rows?: number;
}

export function AdminSkeleton({ type = 'line', rows = 3 }: AdminSkeletonProps) {
  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="admin-card skeleton-stat-card">
            <div className="skeleton-pulse skeleton-kpi-title" />
            <div className="skeleton-pulse skeleton-kpi-value" />
            <div className="skeleton-pulse skeleton-kpi-text" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="admin-card skeleton-card">
        <div className="skeleton-pulse skeleton-title" />
        <div className="skeleton-pulse skeleton-subtitle" />
        <div className="space-y-3 mt-4">
          <div className="skeleton-pulse skeleton-line-full" />
          <div className="skeleton-pulse skeleton-line-mid" />
          <div className="skeleton-pulse skeleton-line-short" />
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="admin-card p-0 overflow-hidden">
        <div className="skeleton-pulse skeleton-table-header" />
        <div className="p-4 space-y-4">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <div className="skeleton-pulse skeleton-text-name" />
              <div className="skeleton-pulse skeleton-text-info" />
              <div className="skeleton-pulse skeleton-text-price" />
              <div className="skeleton-pulse skeleton-text-badge" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton-pulse skeleton-text-line" />
      ))}
    </div>
  );
}

// ==========================================
// 9. ADMIN EMPTY STATE
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
    <AdminCard className="admin-empty-state">
      <div className="admin-empty-state-content">
        <div className="admin-empty-state-icon">
          <WarningCircle size={48} weight="light" />
        </div>
        <h3 className="admin-empty-state-title">{title}</h3>
        <p className="admin-empty-state-description">{description}</p>
        {actionLabel && onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="admin-btn-primary mt-4"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </AdminCard>
  );
}

// ==========================================
// 10. ADMIN QUICK ACTION
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
    <div className="admin-quick-action-card-body">
      <div className="admin-quick-action-icon-box">{icon}</div>
      <div className="admin-quick-action-text-box">
        <h4 className="admin-quick-action-title">{title}</h4>
        <p className="admin-quick-action-description">{description}</p>
      </div>
      <div className="admin-quick-action-arrow">
        <ArrowRight size={16} weight="bold" />
      </div>
    </div>
  );

  return (
    <AdminCard className="admin-quick-action-card">
      {url ? (
        <Link to={url} className="admin-quick-action-link">
          {ActionContent}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className="admin-quick-action-button text-left w-full">
          {ActionContent}
        </button>
      )}
    </AdminCard>
  );
}

// ==========================================
// 11. ADMIN ATTENTION ITEM
// ==========================================
interface AdminAttentionItemProps {
  label: string;
  actionUrl: string;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info';
}

export function AdminAttentionItem({
  label,
  actionUrl,
  badgeText,
  badgeType = 'warning'
}: AdminAttentionItemProps) {
  return (
    <Link to={actionUrl} className="admin-attention-item">
      <div className="admin-attention-item-content">
        <div className={`admin-attention-dot bg-${badgeType}`} />
        <span className="admin-attention-label">{label}</span>
      </div>
      <div className="admin-attention-right">
        {badgeText && (
          <span className={`admin-attention-badge badge-${badgeType}`}>
            {badgeText}
          </span>
        )}
        <ArrowRight className="admin-attention-arrow" size={14} weight="bold" />
      </div>
    </Link>
  );
}

// ==========================================
// 12. PREVIEW MODE BADGE
// ==========================================
export function PreviewModeBadge() {
  return (
    <span className="admin-preview-badge" title="Data on this screen is run in Local Preview Mode and not saved to the database.">
      Preview Mode — Mock Data
    </span>
  );
}
