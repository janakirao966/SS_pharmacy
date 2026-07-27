import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ShieldCheck, MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import Container from './Container';
import { useToast } from '../../context/ToastContext';

interface FooterProps {
  setActiveTab?: (tab: string) => void;
}

export default function Footer({ setActiveTab: _setActiveTab }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { showToast } = useToast();
  const [b2bEmail, setB2bEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleB2bSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bEmail.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      showToast('Thank you! Our B2B sales team will contact you shortly.', 'success');
      setB2bEmail('');
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <footer className="footer-ayurvedic-root" role="contentinfo">
      {/* 1. Top Quote Banner Strip */}
      <div className="footer-top-quote-strip">
        <Container>
          <p className="footer-quote-text">
            <Leaf size={18} className="text-[#A67C3D] shrink-0" aria-hidden="true" />
            <span>Pure Ayurveda. <span className="gold-highlight">Trusted Healthcare & Statutory Quality</span> Since 1970.</span>
            <Leaf size={18} className="text-[#A67C3D] shrink-0 transform scale-x-[-1]" aria-hidden="true" />
          </p>
        </Container>
      </div>

      <Container>
        {/* 2. Main 5-Column Navigation & Info Grid */}
        <div className="footer-main-grid-5col">
          {/* Column 1: Brand Logo & Mission */}
          <div className="footer-col-group">
            <div className="flex items-center gap-4 mb-3">
              <img
                src={`${import.meta.env.BASE_URL}products/logo/logo.webp`}
                alt="S.S. PHARMACY Brand Logo"
                width={58}
                height={58}
                decoding="async"
                className="footer-logo-img"
              />
              <div>
                <h3 className="footer-brand-title">S.S. PHARMACY</h3>
                <span className="footer-brand-tagline">Pure Ayurveda, Pure Life</span>
              </div>
            </div>
            
            <p className="footer-brand-desc">
              Licensed Ayurvedic manufacturing facility operating in Yerraguntla, Andhra Pradesh. Crafting time-tested herbal formulations under strict Schedule T quality standards.
            </p>

            <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-[#FCFAF5] border border-[#DCD2C1] text-xs text-[#57544E] shadow-xs">
              <ShieldCheck size={16} className="shrink-0 text-[#A67C3D]" />
              <span className="font-semibold text-[#57544E]">Mfg. Lic. Code: <strong className="text-[#183D2B]">R-1970/Ayur</strong></span>
            </div>
          </div>

          {/* Column 2: Company Navigation */}
          <div className="footer-col-group">
            <h4 className="footer-col-heading">Company</h4>
            <ul className="footer-link-list">
              <li>
                <Link to="/about" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>About S.S. Pharmacy</span>
                </Link>
              </li>
              <li>
                <Link to="/manufacturing" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Manufacturing Facility</span>
                </Link>
              </li>
              <li>
                <Link to="/why-choose-us" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Why Choose Us</span>
                </Link>
              </li>
              <li>
                <Link to="/distributor" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Distributor Opportunities</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Contact Our Unit</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Formulations */}
          <div className="footer-col-group">
            <h4 className="footer-col-heading">Formulations</h4>
            <ul className="footer-link-list">
              <li>
                <Link to="/products/dr-lion-pain-cream" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Dr. Lion Pain Cream</span>
                </Link>
              </li>
              <li>
                <Link to="/products/dr-lion-pain-pills" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Dr. Lion Pain Pills</span>
                </Link>
              </li>
              <li>
                <Link to="/products/moon-light-cream" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Moon Light Cream</span>
                </Link>
              </li>
              <li>
                <Link to="/products" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Full Product Catalog</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Policies */}
          <div className="footer-col-group">
            <h4 className="footer-col-heading">Support &amp; Policies</h4>
            <ul className="footer-link-list">
              <li>
                <Link to="/track-order" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Track Active Order</span>
                </Link>
              </li>
              <li>
                <Link to="/account/support" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Customer Support Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/faq" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>FAQ &amp; Product Info</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Terms &amp; Conditions</span>
                </Link>
              </li>
              <li>
                <Link to="/accessibility" onClick={handleScrollTop} className="footer-nav-link">
                  <ArrowRight size={12} className="text-[#A67C3D]" />
                  <span>Accessibility Statement</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact Facility */}
          <div className="footer-col-group">
            <h4 className="footer-col-heading">Contact Facility</h4>
            <div className="footer-contact-item">
              <MapPin size={16} className="footer-contact-icon" />
              <span>D. No. 1-2-211 &amp; 1-2-212, Prakash Nagar, Yerraguntla, YSR Kadapa Dist., A.P. - 516309</span>
            </div>
            <div className="footer-contact-item">
              <Phone size={16} className="footer-contact-icon" />
              <a href="tel:+919494323211" className="hover:text-[#C5A059] transition-colors">+91 94943 23211</a>
            </div>
            <div className="footer-contact-item">
              <Mail size={16} className="footer-contact-icon" />
              <a href="mailto:info@sspharmacy.com" className="hover:text-[#C5A059] transition-colors">info@sspharmacy.com</a>
            </div>
            <div className="footer-contact-item">
              <Clock size={16} className="footer-contact-icon" />
              <span>Mon – Sat: 9:00 AM – 6:00 PM</span>
            </div>
          </div>
        </div>

        {/* 3. Newsletter & Social Links Strip */}
        <div className="footer-b2b-social-strip">
          <form onSubmit={handleB2bSubmit} className="footer-b2b-form-wrap">
            <h5 className="footer-b2b-form-title">Wholesale &amp; B2B Partner Updates</h5>
            <p className="footer-b2b-form-sub">Receive bulk pricing sheets and new distributor allocation alerts.</p>
            <div className="footer-b2b-input-group">
              <input
                type="email"
                required
                value={b2bEmail}
                onChange={(e) => setB2bEmail(e.target.value)}
                placeholder="Enter your medical shop/email address..."
                className="footer-b2b-input"
                aria-label="Email address for B2B distributor updates"
              />
              <button type="submit" disabled={isSubmitting} className="footer-b2b-btn">
                <span>{isSubmitting ? 'Sending...' : 'Subscribe'}</span>
              </button>
            </div>
          </form>

          <div className="footer-social-icons-group">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              aria-label="Follow S.S. PHARMACY on Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              aria-label="Follow S.S. PHARMACY on Facebook"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              aria-label="Watch S.S. PHARMACY videos on YouTube"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon-btn"
              aria-label="Connect with S.S. PHARMACY on LinkedIn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>

        {/* 5. Bottom Copyright & Legal Bar */}
        <div className="footer-bottom-legal-bar">
          <p className="m-0">
            &copy; {currentYear} S.S. PHARMACY. All rights reserved. | Government Mfg. Lic. No. R-1970/Ayur
          </p>
          <div className="footer-bottom-nav-links">
            <Link to="/track-order" onClick={handleScrollTop}>Track Order</Link>
            <span className="text-white/20">•</span>
            <Link to="/about" onClick={handleScrollTop}>Sitemap</Link>
            <span className="text-white/20">•</span>
            <Link to="/admin/login" onClick={handleScrollTop}>Admin Portal</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}


