import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, Trash } from '@phosphor-icons/react';

export default function AdminMedia() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [assets, setAssets] = useState([
    {
      id: 1,
      filename: 'Pain cream front view.webp',
      src: `${import.meta.env.BASE_URL}products/Dr lion pain cream/Pain cream front view.webp`,
      dimensions: '800 x 800',
      size: '42 KB',
      category: 'Product Image'
    },
    {
      id: 2,
      filename: 'Moon cream front view.webp',
      src: `${import.meta.env.BASE_URL}products/Moon-light/Moon cream front view.webp`,
      dimensions: '800 x 800',
      size: '38 KB',
      category: 'Product Image'
    },
    {
      id: 3,
      filename: 'Pain_pills.webp',
      src: `${import.meta.env.BASE_URL}products/Dr lion Pain pills/Pain_pills.webp`,
      dimensions: '800 x 800',
      size: '46 KB',
      category: 'Product Image'
    },
    {
      id: 4,
      filename: 'home_page_image.webp',
      src: `${import.meta.env.BASE_URL}products/Hero%20section/home_page_image.webp`,
      dimensions: '1920 x 1080',
      size: '184 KB',
      category: 'Hero Slide'
    },
    {
      id: 5,
      filename: 'logo.webp',
      src: `${import.meta.env.BASE_URL}products/logo/logo.webp`,
      dimensions: '512 x 512',
      size: '12 KB',
      category: 'Branding Logo'
    }
  ]);

  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId === null) return;
    setIsConfirmOpen(false);

    setAssets(prev => prev.filter(a => a.id !== pendingDeleteId));
    showToast('Deleted asset from local media library preview.', 'success');
    setPendingDeleteId(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">CMS Media Store</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Media Assets Library</h1>
          </div>

          <button 
            type="button" 
            onClick={() => showToast('Media uploads are disabled in Preview Mode.', 'info')} 
            className="admin-btn-primary"
          >
            <Plus size={16} weight="bold" />
            <span>Add Asset</span>
          </button>
        </div>

        {/* Media Asset List grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <AdminCard key={asset.id} className="p-0 overflow-hidden flex flex-col justify-between group">
              {/* Media preview */}
              <div className="relative aspect-square bg-[#FEFDF8] border-b border-slate-100 flex items-center justify-center p-3">
                <img 
                  src={asset.src} 
                  alt={asset.filename} 
                  className="max-h-[120px] object-contain group-hover:scale-102 transition-transform duration-200"
                />
              </div>

              {/* Metadata details */}
              <div className="p-3 space-y-1.5 bg-white">
                <p className="font-bold text-[10px] text-[#1D3A28] truncate" title={asset.filename}>
                  {asset.filename}
                </p>
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                  <span>{asset.dimensions}</span>
                  <span>{asset.size}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                  <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                    {asset.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(asset.id)}
                    className="text-[#B91C1C] hover:text-[#991B1B] p-1"
                    title="Delete asset file"
                  >
                    <Trash size={10} />
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Media File?"
        message="Are you sure you want to delete this media asset? Any content referencing this local image path might show as broken in preview."
        confirmLabel="Delete Asset"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
    </AdminLayout>
  );
}
