import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Lock, FloppyDisk } from '@phosphor-icons/react';

export default function AdminSecurity() {
  const { showToast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please input a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmChangePassword = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setPassword('');
      setConfirmPassword('');
      showToast('Admin password updated successfully.', 'success');
    } catch (err: any) {
      console.error('Password update failure:', err);
      setError(err.message || 'Failed to update password.');
      showToast('Error modifying password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Administrative Security Credentials</span>
          <p className="text-xs text-[#71717a] margin-0">Update account password and active session authentication parameters</p>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Update Administrator Password</h3>
            </div>

            {error && (
              <div className="p-3 bg-[#fbfbf5] border border-[#dc2626] text-[#dc2626] rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">New Password *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#71717a]">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Confirm New Password *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#71717a]">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#f4f4f0]">
              <button
                type="submit"
                disabled={loading || (!password && !confirmPassword)}
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} weight="bold" />
                <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Change Admin Password?"
        message="Are you sure you want to modify your administrator account password? You will need to use this new password on your next login."
        confirmLabel="Update Password"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmChangePassword}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
