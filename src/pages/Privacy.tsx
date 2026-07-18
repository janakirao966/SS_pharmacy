import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function Privacy() {
  return (
    <div className="privacy-page">
      <SEO
        title="Privacy Policy - S.S. PHARMACY"
        description="Read how S.S. PHARMACY handles your contact submissions and B2B partner application data."
        canonical="https://sspharmacy.com/privacy"
      />
      <Section className="pt-page-header pb-24">
        <Container className="max-w-[800px] mx-auto text-left">
          <span className="eyebrow-badge">Data Policy</span>
          <h1 className="page-title mt-2">Privacy Policy</h1>
          <p className="text-secondary text-xs mt-2">Last Updated: July 2026</p>

          <CleanCard variant="default" className="mt-8" innerClassName="legal-text-box p-8 bg-white">
            <h3 className="text-lg font-bold text-[#3D6B20]">1. Data We Collect</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We collect personal information that you voluntarily provide to us when submitting inquiries or distributor applications (such as name, phone number, email address, company details, and distribution regions).
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">2. How We Use Your Data</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We use collected information solely to process your purchase inquiries, evaluate distributorship applications, and communicate with you directly. All B2B data is processed securely in compliance with the Digital Personal Data Protection (DPDP) Act of India and GDPR guidelines. S.S. PHARMACY does not sell or lease user data to third-party advertisers.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">3. Consent</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              By submitting our lead forms and selecting the consent checkbox, you agree to be contacted by S.S. PHARMACY team members regarding your inquiry via email, call, or messaging applications.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">4. Data Security</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We implement standard administrative and technical safeguards to protect collected lead information from unauthorized access.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">5. Your Data Rights</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              Under the DPDP Act and GDPR, you have the right to request access to the personal data we hold about you, request corrections to inaccurate information, or request the erasure of your lead records from our systems. To exercise these rights, please email us at <a href="mailto:info@sspharmacy.com" className="hover:underline font-semibold" style={{ color: 'var(--color-brand-primary)' }}>info@sspharmacy.com</a>.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">6. Cookies & Analytics</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We use subtle first-party cookies and browser local storage features to support basic functional states (such as retaining items in your B2B sample cart). We do not engage in intrusive cross-site ad-targeting or behavioral profiling.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">7. Grievance Officer</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              If you have any questions about this Privacy Policy or wish to file a data-related complaint, you may contact our Grievance Officer at <a href="mailto:info@sspharmacy.com" className="hover:underline font-semibold" style={{ color: 'var(--color-brand-primary)' }}>info@sspharmacy.com</a>.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">8. Policy Updates</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              We reserve the right to modify this Privacy Policy. Any updates will be posted directly on this page with an updated date.
            </p>
          </CleanCard>
        </Container>
      </Section>
    </div>
  );
}
