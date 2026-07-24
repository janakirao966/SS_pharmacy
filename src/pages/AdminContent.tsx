import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { FloppyDisk } from '@phosphor-icons/react';

export default function AdminContent() {
  const { showToast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Mock Homepage content state
  const [homepage, setHomepage] = useState({
    heroTitle: 'Authentic Ayurvedic Medicines & licensed manufacturing',
    heroSubtitle: 'PURE AYURVEDA, PURE LIFE',
    heroDescription: 'Showcasing authentic Ayurvedic formulations manufactured at our licensed facility.',
    trustHeading: 'Licensed Manufacturing Standards',
    trustText: 'S.S. PHARMACY operates under manufacturing licence number R-1970/Ayur.'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHomepage((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    setIsConfirmOpen(false);
    setIsDirty(false);
    showToast('Homepage editorial content saved in Preview Mode.', 'success');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">CMS Website Editor</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Homepage & Editorial Content</h1>
          </div>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2">
              Landing Page Hero Section
            </h3>

            <div className="space-y-4">
              <div className="admin-field-group">
                <label className="admin-field-label">Hero Title / H1</label>
                <input
                  type="text"
                  name="heroTitle"
                  value={homepage.heroTitle}
                  onChange={handleInputChange}
                  className="admin-input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="admin-field-group">
                  <label className="admin-field-label">Hero Subtitle Eyebrow</label>
                  <input
                    type="text"
                    name="heroSubtitle"
                    value={homepage.heroSubtitle}
                    onChange={handleInputChange}
                    className="admin-input-field"
                  />
                </div>
                
                <div className="admin-field-group">
                  <label className="admin-field-label">Hero Description</label>
                  <textarea
                    name="heroDescription"
                    value={homepage.heroDescription}
                    onChange={handleInputChange}
                    className="admin-input-field h-12 py-2"
                  />
                </div>
              </div>
            </div>

            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2 pt-4">
              Trust & Licensing Panel
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="admin-field-group">
                <label className="admin-field-label">Trust Card Title</label>
                <input
                  type="text"
                  name="trustHeading"
                  value={homepage.trustHeading}
                  onChange={handleInputChange}
                  className="admin-input-field"
                />
              </div>
              
              <div className="admin-field-group">
                <label className="admin-field-label">Licence Description Statement</label>
                <textarea
                  name="trustText"
                  value={homepage.trustText}
                  onChange={handleInputChange}
                  className="admin-input-field h-12 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={!isDirty}
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Save CMS Content?"
        message="Are you sure you want to write these modifications to the homepage text? This is a preview mode operation."
        confirmLabel="Save"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
