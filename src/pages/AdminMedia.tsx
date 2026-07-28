import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminEmptyState, AdminInput, AdminSelect } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, Trash, Copy, Image } from '@phosphor-icons/react';

export default function AdminMedia() {
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Upload modal state
  const [newFilename, setNewFilename] = useState('');
  const [newCategory, setNewCategory] = useState('Product Image');

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
    showToast('Deleted media asset file.', 'success');
    setPendingDeleteId(null);
  };

  const handleCopyUrl = (src: string) => {
    navigator.clipboard.writeText(src);
    showToast('Media URL copied to clipboard.', 'info');
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilename.trim()) {
      showToast('Filename is required.', 'error');
      return;
    }

    const newAsset = {
      id: Date.now(),
      filename: newFilename.trim().endsWith('.webp') ? newFilename.trim() : `${newFilename.trim()}.webp`,
      src: `${import.meta.env.BASE_URL}products/Hero%20section/home_page_image.webp`,
      dimensions: '1200 x 1200',
      size: '64 KB',
      category: newCategory
    };

    setAssets(prev => [newAsset, ...prev]);
    showToast('New media asset uploaded to library.', 'success');
    setIsUploadModalOpen(false);
    setNewFilename('');
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader & Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">CMS Media Store & Library</span>
            <p className="text-xs text-[#71717a] margin-0">Manage stored product packshots, branding assets, and hero section images</p>
          </div>

          <button 
            type="button" 
            onClick={() => setIsUploadModalOpen(true)} 
            className="admin-btn-primary self-start sm:self-auto"
          >
            <Plus size={14} weight="bold" />
            <span>Upload New Asset</span>
          </button>
        </div>

        {/* Media Grid */}
        {assets.length === 0 ? (
          <AdminEmptyState
            title="No Media Assets Found"
            description="Upload image files to populate the CMS media library."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {assets.map((asset) => (
              <AdminCard key={asset.id} className="p-0 overflow-hidden flex flex-col justify-between group">
                {/* Media Preview Container */}
                <div className="relative aspect-square bg-[#fbfbf5] border-b border-[#e4e4e7] flex items-center justify-center p-3">
                  <img 
                    src={asset.src} 
                    alt={asset.filename} 
                    className="max-h-[110px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Metadata Details & Actions */}
                <div className="p-3 space-y-1.5 bg-[#ffffff]">
                  <p className="font-semibold text-xs text-[#000000] truncate m-0" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <div className="flex justify-between items-center text-[0.68rem] text-[#71717a] font-mono">
                    <span>{asset.dimensions}</span>
                    <span>{asset.size}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#f4f4f0]">
                    <span className="bg-[#f4f4f0] text-[#000000] text-[0.65rem] font-mono font-semibold px-1.5 py-0.5 rounded uppercase">
                      {asset.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(asset.src)}
                        className="text-[#71717a] hover:text-[#000000] p-1"
                        title="Copy Asset URL"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(asset.id)}
                        className="text-[#dc2626] hover:text-[#b91c1c] p-1"
                        title="Delete asset file"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>

      {/* Upload Asset Modal Dialog */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AdminCard className="w-full max-w-md space-y-4 bg-white p-5">
            <div className="border-b border-[#f4f4f0] pb-2 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#000000] m-0">Upload New Media Asset</h3>
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
                label="Filename / Asset Identifier *"
                type="text"
                placeholder="e.g. pain_cream_hero_banner.webp"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                className="font-mono"
              />

              <AdminSelect
                label="Asset Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={[
                  { label: "Product Image", value: "Product Image" },
                  { label: "Hero Slide", value: "Hero Slide" },
                  { label: "Branding Logo", value: "Branding Logo" },
                  { label: "Banner", value: "Banner" }
                ]}
              />

              {/* Upload Dropzone */}
              <div className="p-4 border-2 border-dashed border-[#e4e4e7] rounded-xl text-center bg-[#fbfbf5] space-y-1">
                <Image size={24} className="text-[#71717a] mx-auto" />
                <span className="text-xs font-semibold text-[#000000] block">Drop files here or click to select</span>
                <span className="text-[0.68rem] text-[#71717a] block">Supports .webp, .png, .jpg up to 5MB</span>
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
                  Upload Asset
                </button>
              </div>
            </form>
          </AdminCard>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Media File?"
        message="Are you sure you want to delete this media asset from the storage library? Any content referencing this image path will be affected."
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
