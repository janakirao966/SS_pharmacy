import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import SEO from '../components/ui/SEO';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot field
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both your admin email and password.');
      return;
    }

    if (honeypot) {
      console.warn('Bot attempt blocked via honeypot field.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Supabase Auth Error details:', authError);
        setError(authError.message || 'Invalid admin credentials. Please check your email and password.');
      } else if (data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.session.user.id)
          .single();

        if (profile?.is_admin) {
          sessionStorage.setItem('ssp-admin-auth', 'true');
          showToast('Welcome to S.S. PHARMACY Admin Control Center', 'success');
          navigate('/admin/orders');
        } else {
          setError('Access Denied: Your account does not have administrator privileges.');
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error('Admin authentication failure:', err);
      setError('Connection error during admin authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Admin Control Center | S.S. PHARMACY" description="Secure access portal for authorized S.S. PHARMACY administrators." />

      <div className="admin-login-page">
        <div className="admin-login-container">
          {/* Header Brand Section */}
          <div className="admin-login-header">
            <div className="admin-brand-box" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <img
                src={`${import.meta.env.BASE_URL}products/logo/logo.webp`}
                alt="S.S. PHARMACY Logo"
                width={64}
                height={64}
                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.5rem', fontWeight: 800, color: '#1D3A28', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
                  S.S. PHARMACY
                </span>
                <span style={{ fontSize: '0.75rem', color: '#8A6B29', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginTop: '0.125rem' }}>
                  Pure Ayurveda, Pure Life
                </span>
              </div>
            </div>

            <h1 className="admin-login-title" style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>Admin Control Center</h1>
            <p className="admin-login-subtitle">Enterprise portal authentication</p>
          </div>

          {/* Elevated Card Container */}
          <div className="admin-login-card">
            <form onSubmit={handleLogin} className="admin-form-space">
              {/* Invisible Anti-Bot Field */}
              <div className="sr-only" aria-hidden="true" style={{ display: 'none' }}>
                <input
                  type="text"
                  name="website_url_check"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  fontSize: '0.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, color: '#EF4444' }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Admin Email Field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Email Address</label>
                <div className="admin-input-wrapper">
                  <div className="admin-input-icon">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="name@sspharmacy.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="admin-input-field"
                  />
                </div>
              </div>

              {/* Admin Password Field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Password *</label>
                <div className="admin-input-wrapper">
                  <div className="admin-input-icon">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="admin-input-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="admin-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="admin-btn-submit"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="admin-card-footer">
                <p className="admin-footer-text">
                  &copy; {new Date().getFullYear()} S.S. PHARMACY • Mfg. Lic. No. R-1970/Ayur
                </p>
              </div>
            </form>
          </div>

          {/* Bottom Back Link */}
          <div className="admin-back-link-wrapper">
            <Link to="/" className="admin-back-link">
              ← Back to storefront
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
