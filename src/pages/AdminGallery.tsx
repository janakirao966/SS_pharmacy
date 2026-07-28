import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, AdminEmptyState, AdminInput, AdminSelect } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, EyeSlash, Trash, Image } from '@phosphor-icons/react';

export default function AdminGallery() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'hide' | 'delete'; id: number } | null>(null);

  // Upload modal state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Packaging');

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
      src: `${import.meta.env.BASE_URL}products/Hero%20section/home_page_image.webp`,
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
      showToast('Toggled gallery item visibility.', 'success');
    } else if (type === 'delete') {
      setGalleryItems(prev => prev.filter(item => item.id !== id));
      showToast('Deleted gallery asset.', 'success');
    }

    setPendingAction(null);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Asset title is required.', 'error');
      return;
    }

    const newItem = {
      id: Date.now(),
      src: `${import.meta.env.BASE_URL}products/Hero%20section/home_page_image.webp`,
      title: newTitle.trim(),
      category: newCategory,
      status: 'active'
    };

    setGalleryItems(prev => [newItem, ...prev]);
    showToast('Gallery image uploaded successfully.', 'success');
    setIsUploadModalOpen(false);
    setNewTitle('');
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader & Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">CMS Product & Facility Gallery</span>
            <p className="text-xs text-[#71717a] margin-0">Manage showcase imagery, packaging packshots, and licensed manufacturing facility photos</p>
          </div>

          <button 
            type="button" 
            onClick={() => setIsUploadModalOpen(true)} 
            className="admin-btn-primary self-start sm:self-auto"
          >
            <Plus size={14} weight="bold" />
            <span>Upload Gallery Image</span>
          </button>
        </div>

        {/* Gallery Image Grid */}
        {galleryItems.length === 0 ? (
          <AdminEmptyState
            title="No Gallery Images Available"
            description="Upload packaging packshots or manufacturing facility photos to populate the storefront gallery."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <AdminCard key={item.id} className="p-0 overflow-hidden flex flex-col justify-between">
                {/* Image Container with preserved aspect ratio */}
                <div className="relative aspect-video bg-[#fbfbf5] border-b border-[#e4e4e7] flex items-center justify-center p-3">
                  <img 
                    src={item.src} 
                    alt={item.title} 
                    className="max-h-[140px] w-auto object-contain"
                  />
                  <span className="absolute top-2 left-2 bg-[#000000] text-[#ffffff] text-[0.68rem] font-mono font-semibold px-2 py-0.5 rounded-full uppercase">
                    {item.category}
                  </span>
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-3 space-y-2">
                  <h4 className="font-semibold text-xs text-[#000000] line-clamp-1 m-0">{item.title}</h4>
                  <div className="flex justify-between items-center pt-1 border-t border-[#f4f4f0]">
                    <AdminStatusBadge status={item.status} />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleActionClick('hide', item.id)}
                        className="admin-btn-action text-[0.7rem] !py-1 !px-2"
                      >
                        <EyeSlash size={12} />
                        <span>{item.status === 'active' ? 'Hide' : 'Show'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick('delete', item.id)}
                        className="admin-btn-action danger text-[0.7rem] !p-1.5"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal Dialog */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AdminCard className="w-full max-w-md space-y-4 bg-white p-5">
            <div className="border-b border-[#f4f4f0] pb-2 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#000000] m-0">Upload Gallery Image</h3>
              <button 
                type="button" 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-[#71717a] hover:text-[#000000] font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <AdminInput
                label="Image Title / Caption *"
                type="text"
                placeholder="e.g. Manufacturing Facility Batch Line"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />

              <AdminSelect
                label="Asset Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={[
                  { value: 'Packaging', label: 'Packaging' },
                  { value: 'Facility', label: 'Facility & Plant' },
                  { value: 'Formulation', label: 'Formulation' },
                  { value: 'Certificate', label: 'Certificate / License' },
                ]}
              />

              {/* Upload Dropzone */}
              <div className="p-4 border-2 border-dashed border-[#e4e4e7] rounded-xl text-center bg-[#fbfbf5] space-y-1">
                <Image size={24} className="text-[#71717a] mx-auto" />
                <span className="text-xs font-semibold text-[#000000] block">Drop files here or click to select</span>
                <span className="text-[0.68rem] text-[#71717a] block">Supports .webp, .png, .jpg up to 2MB</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f4f4f0]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                >
                  Upload Image
                </button>
              </div>
            </form>
          </AdminCard>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'hide' ? 'Moderate Gallery Item?' : 'Delete Gallery Item?'}
        message={
          pendingAction?.type === 'hide'
            ? 'Are you sure you want to toggle the publication status of this gallery image?'
            : 'Are you sure you want to delete this gallery item? This action is permanent.'
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
