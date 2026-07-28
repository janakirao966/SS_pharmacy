import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminInput } from '../components/admin/AdminPrimitives';
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
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Administrator Profile Manager</span>
          <p className="text-xs text-[#71717a] margin-0">Manage account credentials, display name, and system privileges</p>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Profile Metadata & Identity</h3>
            </div>

            <div className="space-y-4 text-xs">
              <AdminInput
                label="Email Account (Auth)"
                type="text"
                value={profile?.email || ''}
                disabled
                className="font-mono bg-[#f4f4f0] text-[#71717a] cursor-not-allowed"
              />

              <AdminInput
                label="Display Full Name"
                type="text"
                value={fullName}
                onChange={handleNameChange}
                className="font-semibold text-[#000000]"
                placeholder="e.g. Admin User"
              />

              <AdminInput
                label="System Privilege Level"
                type="text"
                value={profile?.is_admin ? 'Super Administrator (Full RLS Override)' : 'Member'}
                disabled
                className="font-semibold bg-[#f4f4f0] text-[#000000] cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[#f4f4f0]">
              <button
                type="submit"
                disabled={!isDirty}
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} weight="bold" />
                <span>Save Profile Updates</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Update Administrator Profile?"
        message="Are you sure you want to write these modifications to your administrator account details?"
        confirmLabel="Save Profile"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
