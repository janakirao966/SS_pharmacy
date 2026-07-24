import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, PreviewModeBadge, AdminDataTable, AdminMobileRecord } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, EyeSlash, Trash } from '@phosphor-icons/react';

export default function AdminTestimonials() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'hide' | 'delete'; id: number } | null>(null);

  const [testimonials, setTestimonials] = useState([
    {
      id: 1,
      quote: "S.S. PHARMACY has been a trusted supplier for our medical shops. Their packaging and batch reliability are highly satisfactory.",
      author: "K. Raghunatha Reddy",
      role: "Distributor Partner",
      location: "Kadapa, AP",
      status: 'published'
    },
    {
      id: 2,
      quote: "The Dr. Lion Pain Cream has been well-received by our customers seeking support for everyday joint comfort.",
      author: "Dr. A. Prasad",
      role: "Ayurvedic Clinic Lead",
      location: "Tirupati, AP",
      status: 'published'
    },
    {
      id: 3,
      quote: "Moon Light Cream stands out for its smooth texture and consistent herbal scent.",
      author: "S. Lakshmi",
      role: "Retail Pharmacy Partner",
      location: "Nellore, AP",
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
      showToast('Toggled testimonial publication state in Preview Mode.', 'success');
    } else if (type === 'delete') {
      setTestimonials(prev => prev.filter(t => t.id !== id));
      showToast('Deleted testimonial card from local preview list.', 'success');
    }

    setPendingAction(null);
  };

  const columns = [
    { 
      header: 'Author / Info', 
      render: (t: any) => (
        <div>
          <span className="font-bold text-[#1D3A28] block">{t.author}</span>
          <span className="text-[10px] text-slate-400 block">{t.role} · {t.location}</span>
        </div>
      )
    },
    { 
      header: 'Quote Body', 
      render: (t: any) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-md italic">
          "{t.quote}"
        </span>
      )
    },
    { header: 'Status', render: (t: any) => <AdminStatusBadge status={t.status} /> },
    {
      header: 'Actions',
      render: (t: any) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleActionClick('hide', t.id)}
            className="admin-btn-action"
            title={t.status === 'published' ? 'Unpublish / Draft' : 'Publish / Moderate'}
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
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">CMS Reviews</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Testimonial & Partner Reviews</h1>
          </div>

          <button 
            type="button" 
            onClick={() => showToast('Testimonial dialog modal is in Preview Mode.', 'info')} 
            className="admin-btn-primary"
          >
            <Plus size={16} weight="bold" />
            <span>Add Review</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Desktop view */}
          <div className="hidden sm:block">
            <AdminCard className="p-0 overflow-hidden">
              <AdminDataTable
                columns={columns}
                data={testimonials}
                keyExtractor={(t) => t.id}
              />
            </AdminCard>
          </div>

          {/* Mobile view */}
          <div className="sm:hidden space-y-3">
            {testimonials.map((t) => (
              <AdminMobileRecord
                key={t.id}
                title={t.author}
                subtitle={`${t.role} · ${t.location}`}
                meta={`"${t.quote.substring(0, 50)}..."`}
                badge={<AdminStatusBadge status={t.status} />}
                onClick={() => handleActionClick('hide', t.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'hide' ? 'Moderate Testimonial?' : 'Delete Testimonial?'}
        message={
          pendingAction?.type === 'hide'
            ? 'Are you sure you want to toggle the publication state of this review in local preview mode?'
            : 'Are you sure you want to delete this testimonial? It will be removed from your local preview list.'
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
