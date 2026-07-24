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
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">Security Manager</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28]">Administrative Credentials</h1>
          </div>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2">
              Update Admin Password
            </h3>

            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="admin-field-group">
                <label className="admin-field-label">New Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin-input-field pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Confirm New Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="admin-input-field pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading || (!password && !confirmPassword)}
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} />
                <span>{loading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Change Admin Password?"
        message="Are you sure you want to modify your administrator account login password? This will affect your next login session."
        confirmLabel="Update Password"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmChangePassword}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
