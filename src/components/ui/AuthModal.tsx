import { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, Lock, User, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useAuth, type AuthModalMode } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  initialMode?: AuthModalMode;
}

export default function AuthModal({ isOpen: propIsOpen, onClose: propOnClose, onSuccess, initialMode }: AuthModalProps) {
  const { showToast } = useToast();
  const authCtx = useAuth();

  const isModalOpen = propIsOpen !== undefined ? propIsOpen : authCtx.isAuthOpen;
  const handleCloseModal = propOnClose || authCtx.closeAuthModal;
  const activeMode = initialMode || authCtx.authModalMode || 'login';

  const [mode, setMode] = useState<AuthModalMode>(activeMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setMode(activeMode);
    setError(null);
    setSuccessMessage(null);
  }, [activeMode, isModalOpen]);

  if (!isModalOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (authError) {
          setError(authError.message);
        } else if (data.session) {
          showToast('Welcome back to S.S. PHARMACY!', 'success');
          if (onSuccess) onSuccess();
          handleCloseModal();
        }
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match. Please re-enter your password.');
          setLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone
            }
          }
        });

        if (authError) {
          setError(authError.message);
        } else if (data.user) {
          showToast('Account created successfully!', 'success');
          if (onSuccess) onSuccess();
          handleCloseModal();
        }
      } else if (mode === 'forgot') {
        if (!formData.email.trim()) {
          setError('Please enter your email address.');
          setLoading(false);
          return;
        }

        // Base-path safe redirect URL to support both GitHub Pages (/SS_pharmacy/) and custom domain
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
        const redirectUrl = `${window.location.origin}${baseUrl}#/reset-password`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
          redirectTo: redirectUrl
        });

        if (resetError) {
          setError(resetError.message);
        } else {
          setSuccessMessage('Password reset link sent! Please check your email inbox.');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup':
        return 'Create Account';
      case 'forgot':
        return 'Reset Password';
      case 'login':
      default:
        return 'Customer Sign In';
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FEFDF8] rounded-2xl max-w-sm w-full border border-[#C5A059]/40 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-[#1D3A28] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#C5A059]" />
            <div>
              <h3 className="font-display font-bold text-base tracking-wide">
                {getTitle()}
              </h3>
              <p className="text-[10px] text-slate-300 font-sans">S.S. PHARMACY Member Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close authentication modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5 font-medium border border-emerald-200">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Phone *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">Password *</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] text-[#1D3A28] hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full bg-[#1D3A28] hover:bg-[#2D5016] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            {mode === 'login' && (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[#1D3A28] font-bold hover:underline"
                >
                  Sign Up
                </button>
              </span>
            )}
            {mode === 'signup' && (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#1D3A28] font-bold hover:underline"
                >
                  Sign In
                </button>
              </span>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#1D3A28] font-bold hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
