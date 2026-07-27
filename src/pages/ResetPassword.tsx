import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure active auth session exists from reset link token
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('Password reset link is invalid or has expired. Please request a new link.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        showToast('Password updated successfully! Welcome to your account.', 'success');
        navigate('/account');
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err?.message || 'An error occurred while updating your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Reset Password | S.S. PHARMACY" description="Set a new password for your S.S. PHARMACY account." />

      <div className="py-16 px-4 max-w-md mx-auto">
        <div className="bg-[#FEFDF8] rounded-2xl border border-[#C5A059]/40 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1D3A28] text-white p-6 text-center space-y-2">
            <div className="w-12 h-12 bg-white/10 text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto border border-[#C5A059]/30">
              <ShieldCheck size={24} />
            </div>
            <h1 className="font-display font-bold text-xl tracking-wide">Set New Password</h1>
            <p className="text-xs text-slate-300">S.S. PHARMACY Account Recovery</p>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium border border-red-200">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full bg-[#1D3A28] hover:bg-[#2D5016] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
            >
              {loading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
