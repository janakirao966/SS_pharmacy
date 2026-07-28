import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminInput, AdminTextarea } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { FloppyDisk } from '@phosphor-icons/react';

export default function AdminContent() {
  const { showToast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
    showToast('Homepage editorial content saved successfully.', 'success');
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">CMS Website Content Editor</span>
          <p className="text-xs text-[#71717a] margin-0">Manage homepage hero copy, marketing banners, and Ayurvedic manufacturing trust statements</p>
        </div>

        {/* CMS Preview Notice */}
        <div className="admin-cms-preview-banner" role="status">
          <div className="admin-cms-preview-banner-icon">💡</div>
          <div>
            <h4 className="admin-cms-preview-banner-title">Preview / CMS Simulation Mode</h4>
            <p className="admin-cms-preview-banner-text">
              Changes made to landing page editorial text, subtitles, or trust statements are stored in local session memory. 
              These edits will not be published to the live storefront database in this phase.
            </p>
          </div>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Hero Section */}
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">1. Landing Page Hero Section</h3>
            </div>

            <div className="space-y-4 text-xs">
              <AdminInput
                label="Hero Title (H1 Header) *"
                type="text"
                name="heroTitle"
                value={homepage.heroTitle}
                onChange={handleInputChange}
                className="font-semibold text-[#000000]"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  label="Hero Subtitle Eyebrow"
                  type="text"
                  name="heroSubtitle"
                  value={homepage.heroSubtitle}
                  onChange={handleInputChange}
                  className="font-mono uppercase"
                />
                
                <AdminTextarea
                  label="Hero Description Paragraph"
                  rows={2}
                  name="heroDescription"
                  value={homepage.heroDescription}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Section 2: Trust & Licensing Panel */}
            <div className="border-b border-[#f4f4f0] pb-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">2. Trust & Ayush Licensing Panel</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <AdminInput
                label="Trust Card Title"
                type="text"
                name="trustHeading"
                value={homepage.trustHeading}
                onChange={handleInputChange}
                className="font-semibold text-[#000000]"
              />
              
              <AdminTextarea
                label="Licence Statement"
                rows={2}
                name="trustText"
                value={homepage.trustText}
                onChange={handleInputChange}
                className="font-mono"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[#f4f4f0]">
              <button
                type="submit"
                disabled={!isDirty}
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} weight="bold" />
                <span>Save Editorial Content</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Save CMS Content?"
        message="Are you sure you want to write these modifications to the homepage editorial text?"
        confirmLabel="Save Content"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
