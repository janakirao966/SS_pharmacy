import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { FloppyDisk } from '@phosphor-icons/react';

export default function AdminSettings() {
  const { showToast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [settings, setSettings] = useState({
    companyName: 'S.S. Pharmacy',
    contactEmail: 'contact@sspharmacy.com',
    phone: '+91 9494323211',
    whatsapp: '+91 9494323211',
    address: 'Licensed Manufacturing Unit, Yerraguntla, Kadapa District, Andhra Pradesh, India.',
    businessHours: '9:00 AM - 6:00 PM, Monday - Saturday'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    setIsConfirmOpen(false);
    setIsDirty(false);
    showToast('Company settings written in Preview Mode.', 'success');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">System Configuration</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Company Profile & Contact Settings</h1>
          </div>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2">
              General Contact Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="admin-field-group">
                <label className="admin-field-label">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleInputChange}
                  className="admin-input-field"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Customer Support Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={settings.contactEmail}
                  onChange={handleInputChange}
                  className="admin-input-field font-mono"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Contact Hotline Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={settings.phone}
                  onChange={handleInputChange}
                  className="admin-input-field font-mono"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">WhatsApp Channel Mobile</label>
                <input
                  type="text"
                  name="whatsapp"
                  value={settings.whatsapp}
                  onChange={handleInputChange}
                  className="admin-input-field font-mono"
                />
              </div>

              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Corporate Address</label>
                <input
                  type="text"
                  name="address"
                  value={settings.address}
                  onChange={handleInputChange}
                  className="admin-input-field"
                />
              </div>

              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Office Business Hours</label>
                <input
                  type="text"
                  name="businessHours"
                  value={settings.businessHours}
                  onChange={handleInputChange}
                  className="admin-input-field"
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
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Save Settings Modifications?"
        message="Are you sure you want to write changes to corporate profile and support endpoints? This is a preview mode operation."
        confirmLabel="Save Settings"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
