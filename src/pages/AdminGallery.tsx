import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, EyeSlash, Trash } from '@phosphor-icons/react';

export default function AdminGallery() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'hide' | 'delete'; id: number } | null>(null);

  const [galleryItems, setGalleryItems] = useState([
    {
      id: 1,
      src: `${import.meta.env.BASE_URL}products/Dr lion pain cream/Pain cream front view.webp`,
      title: 'Dr. Lion Pain Cream Packshot',
      category: 'Packaging',
      status: 'active'
    },
    {
      id: 2,
      src: `${import.meta.env.BASE_URL}products/Moon-light/Moon cream front view.webp`,
      title: 'Moon Light Cream Packshot',
      category: 'Packaging',
      status: 'active'
    },
    {
      id: 3,
      src: `${import.meta.env.BASE_URL}products/Hero section/home_page_image.webp`,
      title: 'Licensed Manufacturing Facility',
      category: 'Facility',
      status: 'active'
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
      setGalleryItems(prev =>
        prev.map(item => item.id === id ? { ...item, status: item.status === 'active' ? 'draft' : 'active' } : item)
      );
      showToast('Toggled gallery item visibility in Preview Mode.', 'success');
    } else if (type === 'delete') {
      setGalleryItems(prev => prev.filter(item => item.id !== id));
      showToast('Deleted gallery asset from local preview list.', 'success');
    }

    setPendingAction(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">CMS Media</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Product & Facility Gallery</h1>
          </div>

          <button 
            type="button" 
            onClick={() => showToast('Gallery uploads are disabled in Preview Mode.', 'info')} 
            className="admin-btn-primary"
          >
            <Plus size={16} weight="bold" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Dense media visual grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <AdminCard key={item.id} className="p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative aspect-video bg-[#FEFDF8] border-b border-slate-100 flex items-center justify-center p-4">
                <img 
                  src={item.src} 
                  alt={item.title} 
                  className="max-h-[160px] object-contain"
                />
                <span className="absolute top-2 left-2 bg-[#1D3A28] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-xs text-[#1D3A28] line-clamp-1">{item.title}</h4>
                <div className="flex justify-between items-center">
                  <AdminStatusBadge status={item.status} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleActionClick('hide', item.id)}
                      className="admin-btn-action text-[10px] py-1 px-2"
                    >
                      <EyeSlash size={10} />
                      <span>{item.status === 'active' ? 'Hide' : 'Show'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionClick('delete', item.id)}
                      className="admin-btn-action danger text-[10px] p-1.5"
                    >
                      <Trash size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'hide' ? 'Moderate Gallery visibility?' : 'Delete Gallery Item?'}
        message={
          pendingAction?.type === 'hide'
            ? 'Are you sure you want to change this image publication status in local preview mode?'
            : 'Are you sure you want to delete this gallery item? This action is local to your preview session.'
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
