import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { FloppyDisk } from '@phosphor-icons/react';

export default function AdminProfile() {
  const { profile, refreshSession } = useAuth();
  const { showToast } = useToast();
  
  const [fullName, setFullName] = useState(profile?.full_name || 'Admin User');
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshSession();
      setIsDirty(false);
      showToast('Admin profile name updated successfully.', 'success');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      showToast('Database write failed.', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">Account Manager</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28]">Administrator Profile</h1>
          </div>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2">
              Profile Metadata
            </h3>

            <div className="space-y-4">
              <div className="admin-field-group">
                <label className="admin-field-label">Email Account (Auth)</label>
                <input
                  type="text"
                  value={profile?.email || ''}
                  disabled
                  className="admin-input-field font-mono bg-slate-100 cursor-not-allowed"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Display Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={handleNameChange}
                  className="admin-input-field"
                  placeholder="e.g. Admin User"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Privilege Level</label>
                <input
                  type="text"
                  value={profile?.is_admin ? 'Super Administrator' : 'Member'}
                  disabled
                  className="admin-input-field font-semibold bg-slate-100 cursor-not-allowed text-[#1D3A28]"
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
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Update Profile Details?"
        message="Are you sure you want to write these modifications to your administrator account details?"
        confirmLabel="Save Profile"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
