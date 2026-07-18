import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function Terms() {
  return (
    <div className="terms-page">
      <SEO
        title="Terms & Conditions - S.S. PHARMACY"
        description="Terms of use for S.S. PHARMACY informational lead-generation platform and B2B distributor program."
        canonical="https://sspharmacy.com/terms"
      />
      <Section className="pt-page-header pb-24">
        <Container className="max-w-[800px] mx-auto text-left">
          <span className="eyebrow-badge">Legal</span>
          <h1 className="page-title mt-2">Terms &amp; Conditions</h1>
          <p className="text-secondary text-xs mt-2">Last Updated: July 2026</p>

          <CleanCard variant="default" className="mt-8" innerClassName="legal-text-box p-8 bg-white">
            <h3 className="text-lg font-bold text-[#3D6B20]">1. Agreement to Terms</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              Welcome to S.S. PHARMACY website. By accessing or using this website, you agree to comply with and be bound by these Terms &amp; Conditions.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">2. Medical Disclaimer</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              The information provided on this website is for educational and informational purposes only. It is not intended to substitute for professional medical advice, diagnosis, or treatment. S.S. PHARMACY products are Ayurvedic proprietary formulations, and outcomes can vary. Always consult a qualified healthcare professional regarding any medical concerns.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">3. Intellectual Property</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              All content, trademarks, logos, labels, and product visuals displayed on this website are the property of S.S. PHARMACY. Unauthorized reproduction or distribution of these materials is strictly prohibited.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">4. B2B Inquiry Submissions</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              Submitting a general contact form or distributor application does not guarantee a commercial contract, exclusive territory allotment, or supply of products. All partnerships are subject to formal corporate due diligence, credit checks, and signed written agreements.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">5. Logistics & Bulk Dispatches</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              All product dispatches are carried out in bulk. Shipping schedules, freight allocations, transit risk, and delivery coordinates are established under negotiated B2B distributor contracts. No retail e-commerce transactions or consumer checkouts are processed on this site.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">6. Returns & Quality Claims</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              Claims regarding manufacturing defects, damage, or quantity discrepancies of product batches must be raised with our quality department within 7 business days of delivery. All claims must reference the specific Batch Number and Invoice.
            </p>

            <h3 className="text-lg font-bold text-[#3D6B20] mt-8">7. Governing Law</h3>
            <p className="text-secondary text-sm leading-relaxed mt-2">
              These terms are governed by the laws of India and any disputes will be subject to the exclusive jurisdiction of the courts located in Kadapa, Andhra Pradesh.
            </p>
          </CleanCard>
        </Container>
      </Section>
    </div>
  );
}
