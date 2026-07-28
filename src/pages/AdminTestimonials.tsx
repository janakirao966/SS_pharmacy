import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord,
  AdminFilterBar,
  AdminPagination,
  AdminEmptyState,
  AdminInput,
  AdminTextarea
} from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, EyeSlash, Trash, Star } from '@phosphor-icons/react';

export default function AdminTestimonials() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'hide' | 'delete'; id: number } | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // New review form state
  const [newAuthor, setNewAuthor] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newQuote, setNewQuote] = useState('');

  const [testimonials, setTestimonials] = useState([
    {
      id: 1,
      quote: "S.S. PHARMACY has been a trusted supplier for our medical shops. Their packaging and batch reliability are highly satisfactory.",
      author: "K. Raghunatha Reddy",
      role: "Distributor Partner",
      location: "Kadapa, AP",
      rating: 5,
      status: 'published'
    },
    {
      id: 2,
      quote: "The Dr. Lion Pain Cream has been well-received by our customers seeking support for everyday joint comfort.",
      author: "Dr. A. Prasad",
      role: "Ayurvedic Clinic Lead",
      location: "Tirupati, AP",
      rating: 5,
      status: 'published'
    },
    {
      id: 3,
      quote: "Moon Light Cream stands out for its smooth texture and consistent herbal scent.",
      author: "S. Lakshmi",
      role: "Retail Pharmacy Partner",
      location: "Nellore, AP",
      rating: 4,
      status: 'draft'
    }
  ]);

  const handleActionClick = (type: 'hide' | 'delete', id: number) => {
    setPendingAction({ type, id });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    setIsConfirmOpen(false);
    
    const { type, id } = pendingAction;
    if (type === 'hide') {
      setTestimonials(prev => 
        prev.map(t => t.id === id ? { ...t, status: t.status === 'published' ? 'draft' : 'published' } : t)
      );
      showToast('Toggled testimonial publication status.', 'success');
    } else if (type === 'delete') {
      setTestimonials(prev => prev.filter(t => t.id !== id));
      showToast('Deleted testimonial record.', 'success');
    }

    setPendingAction(null);
  };

  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newQuote.trim()) {
      showToast('Author name and testimonial quote are required.', 'error');
      return;
    }

    const newRecord = {
      id: Date.now(),
      author: newAuthor.trim(),
      role: newRole.trim() || 'Partner',
      location: newLocation.trim() || 'Andhra Pradesh',
      quote: newQuote.trim(),
      rating: 5,
      status: 'published'
    };

    setTestimonials(prev => [newRecord, ...prev]);
    showToast('New testimonial published successfully.', 'success');
    setIsAddModalOpen(false);
    setNewAuthor('');
    setNewRole('');
    setNewLocation('');
    setNewQuote('');
  };

  const filteredTestimonials = testimonials.filter(t => {
    const matchesSearch = t.author.toLowerCase().includes(search.toLowerCase()) ||
                          t.quote.toLowerCase().includes(search.toLowerCase()) ||
                          t.role.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRecords = filteredTestimonials.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedTestimonials = filteredTestimonials.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const filterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Published Reviews', value: 'published' },
    { label: 'Draft / Hidden', value: 'draft' }
  ];

  const columns = [
    { 
      header: 'Author / Partner Info', 
      render: (t: any) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{t.author}</span>
          <span className="text-[0.68rem] text-[#71717a]">{t.role} · {t.location}</span>
        </div>
      )
    },
    { 
      header: 'Rating', 
      render: (t: any) => (
        <div className="flex items-center gap-0.5 text-[#000000]">
          <Star size={12} weight="fill" />
          <span className="font-mono text-xs font-semibold">{t.rating}.0</span>
        </div>
      )
    },
    { 
      header: 'Testimonial Excerpt', 
      render: (t: any) => (
        <span className="text-xs text-[#71717a] line-clamp-2 italic">
          "{t.quote}"
        </span>
      )
    },
    { header: 'Status', render: (t: any) => <AdminStatusBadge status={t.status} /> },
    {
      header: 'Actions',
      render: (t: any) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleActionClick('hide', t.id)}
            className="admin-btn-action"
            title={t.status === 'published' ? 'Unpublish / Draft' : 'Publish'}
          >
            <EyeSlash size={12} />
            <span>{t.status === 'published' ? 'Hide' : 'Show'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleActionClick('delete', t.id)}
            className="admin-btn-action danger"
            title="Delete testimonial"
          >
            <Trash size={12} />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader & Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">CMS Reviews & Testimonials</span>
            <p className="text-xs text-[#71717a] margin-0">Manage customer, clinic lead, and wholesale distributor partner reviews</p>
          </div>

          <button 
            type="button" 
            onClick={() => setIsAddModalOpen(true)} 
            className="admin-btn-primary self-start sm:self-auto"
          >
            <Plus size={14} weight="bold" />
            <span>Add New Review</span>
          </button>
        </div>

        {/* CMS Preview Notice */}
        <div className="admin-cms-preview-banner" role="status">
          <div className="admin-cms-preview-banner-icon">💡</div>
          <div>
            <h4 className="admin-cms-preview-banner-title">Preview / CMS Simulation Mode</h4>
            <p className="admin-cms-preview-banner-text">
              Testimonial management operates in local session memory. 
              New additions or deletion changes will not be written to the live storefront database in this phase.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Author, Partner Role, or Quote text..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Publication Status"
          />
        </AdminCard>

        {/* Testimonials Workspace */}
        {totalRecords === 0 ? (
          <AdminEmptyState
            title="No Testimonial Reviews Found"
            description="No partner or clinic reviews match your search and filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedTestimonials}
                  keyExtractor={(t) => t.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden space-y-3">
              {paginatedTestimonials.map((t) => (
                <AdminMobileRecord
                  key={t.id}
                  title={t.author}
                  subtitle={`${t.role} · ${t.location}`}
                  meta={`"${t.quote.substring(0, 50)}..."`}
                  badge={<AdminStatusBadge status={t.status} />}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Add Review Dialog Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AdminCard className="w-full max-w-lg space-y-4 bg-white p-5">
            <div className="border-b border-[#f4f4f0] pb-2 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#000000] m-0">Add Customer / Partner Testimonial</h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#71717a] hover:text-[#000000] font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReviewSubmit} className="space-y-3 text-xs">
              <AdminInput
                label="Author / Person Name *"
                type="text"
                placeholder="e.g. Dr. A. Prasad"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <AdminInput
                  label="Partner Role / Title"
                  type="text"
                  placeholder="e.g. Clinic Lead"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />

                <AdminInput
                  label="Location"
                  type="text"
                  placeholder="e.g. Tirupati, AP"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <AdminTextarea
                label="Testimonial Quote *"
                rows={3}
                placeholder="State the customer or distributor review statement..."
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f4f4f0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </AdminCard>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'hide' ? 'Moderate Testimonial?' : 'Delete Testimonial?'}
        message={
          pendingAction?.type === 'hide'
            ? 'Are you sure you want to toggle the publication state of this review?'
            : 'Are you sure you want to delete this testimonial? It will be removed from your records.'
        }
        confirmLabel={pendingAction?.type === 'hide' ? 'Toggle' : 'Delete'}
        cancelLabel="Cancel"
        isDestructive={pendingAction?.type === 'delete'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingAction(null);
        }}
      />
    </AdminLayout>
  );
}
