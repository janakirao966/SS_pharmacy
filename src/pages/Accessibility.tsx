import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';
import { Keyboard, Shield, HelpCircle } from 'lucide-react';

export default function Accessibility() {
  return (
    <div className="accessibility-page">
      <SEO
        title="Accessibility Statement - S.S. PHARMACY"
        description="Read S.S. PHARMACY's digital accessibility compliance policy and learn about our keyboard shortcuts and accessibility features."
        canonical="https://sspharmacy.com/accessibility"
      />
      <Section className="pt-page-header pb-24">
        <Container className="max-w-[800px] mx-auto text-left">
          <span className="eyebrow-badge">Compliance</span>
          <h1 className="page-title mt-2">Accessibility Statement</h1>
          <p className="text-secondary text-xs mt-2">Last Updated: July 2026</p>

          <CleanCard variant="default" className="mt-8" innerClassName="legal-text-box p-8 bg-white">
            <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
              <Shield size={20} />
              Our Commitment
            </h2>
            <p className="text-secondary text-sm leading-relaxed mt-3">
              S.S. PHARMACY is committed to ensuring digital accessibility for all visitors, including people with disabilities. We are continuously improving the user experience for everyone and applying the relevant accessibility standards to make our B2B informational platform inclusive.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">1. Conformity Status</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. S.S. PHARMACY website is designed and optimized to conform with **WCAG 2.2 Level AA** standards.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">2. Accessibility Support Features</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              To support screen-reader, keyboard-only, and assistive-device users, we have integrated several core specifications:
            </p>
            <ul className="list-disc pl-5 mt-2 text-secondary text-sm space-y-1">
              <li><strong>Semantic Landmarks:</strong> Proper HTML5 elements like <code>&lt;header&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;article&gt;</code> (product cards), and <code>&lt;figure&gt;</code> (testimonials) to facilitate clean navigation.</li>
              <li><strong>ARIA Controls:</strong> Explicit ARIA labels, roles, and expansion states mapped to all custom interactive components (drawers, search modals, test sliders).</li>
              <li><strong>Live Announcements:</strong> Screen reader live-region notifications that announce search counts and cart items status dynamically.</li>
              <li><strong>Touch Target Dimensions:</strong> All button wrappers and interactive targets designed with a minimum of 44x44px clickable boundaries.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8 flex items-center gap-2">
              <Keyboard size={18} />
              3. Keyboard Navigation Shortcuts
            </h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We support global hotkeys to allow rapid, keyboard-friendly navigation across our B2B features:
            </p>
            <table className="min-w-full mt-3 border border-[#EBE6DC] text-sm text-left">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EBE6DC]">
                  <th className="p-3 font-semibold text-secondary">Shortcut</th>
                  <th className="p-3 font-semibold text-secondary">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#EBE6DC]">
                  <td className="p-3 font-mono font-bold text-brand-primary">Ctrl + K / Cmd + K</td>
                  <td className="p-3 text-secondary">Toggle Search Panel (Open / Close)</td>
                </tr>
                <tr className="border-b border-[#EBE6DC]">
                  <td className="p-3 font-mono font-bold text-brand-primary">Ctrl + B / Cmd + B</td>
                  <td className="p-3 text-secondary">Toggle B2B Cart Drawer (Open / Close)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-brand-primary">Escape</td>
                  <td className="p-3 text-secondary">Close active modal, drawer, or search panel</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8 flex items-center gap-2">
              <HelpCircle size={18} />
              4. Accessibility Feedback
            </h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We welcome your feedback on the accessibility of S.S. PHARMACY. If you encounter accessibility barriers or notice features that could be improved, please let us know by emailing us at <a href="mailto:info@sspharmacy.com" className="hover:underline font-semibold" style={{ color: 'var(--color-brand-primary)' }}>info@sspharmacy.com</a>.
            </p>
          </CleanCard>
        </Container>
      </Section>
    </div>
  );
}
