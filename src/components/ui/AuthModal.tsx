import { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, Lock, User, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <div className="auth-modal-overlay" role="dialog" aria-modal="true" aria-label={getTitle()}>
      <div className="auth-modal-card">
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-header-left">
            <ShieldCheck size={24} className="auth-modal-header-icon" />
            <div>
              <h3 className="auth-modal-header-title">{getTitle()}</h3>
              <p className="auth-modal-header-sub">S.S. PHARMACY Member Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="auth-modal-close-btn"
            aria-label="Close authentication modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-modal-form">
          {error && (
            <div className="auth-alert-error">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert-success">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div className="auth-field-group">
              <label className="auth-field-label">Full Name *</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="auth-input-field"
                />
              </div>
            </div>
          )}

          <div className="auth-field-group">
            <label className="auth-field-label">Email Address *</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="auth-input-field"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-field-group">
              <label className="auth-field-label">Mobile Phone *</label>
              <div className="auth-input-wrapper">
                <Phone size={16} className="auth-input-icon" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="auth-input-field"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="auth-field-group">
              <div className="auth-field-header">
                <label className="auth-field-label">Password *</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="auth-forgot-btn"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="auth-input-field"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="auth-field-group">
              <label className="auth-field-label">Confirm Password *</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="auth-input-field"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="auth-switch-text">
            {mode === 'login' && (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="auth-switch-btn"
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
                  className="auth-switch-btn"
                >
                  Sign In
                </button>
              </span>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="auth-switch-btn"
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
