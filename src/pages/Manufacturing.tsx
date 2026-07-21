import { useState } from 'react';
import { Award, Factory, ChevronLeft, ChevronRight } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function Manufacturing() {
  const [activeCert, setActiveCert] = useState(0);

  const standards = [
    {
      title: "Authentic Formulation Sourcing",
      desc: "Our products follow classic Ayurvedic recipes and preparation rules, utilizing time-tested herbal ratios. Every raw herb is checked for quality parameters and purity before entering the extraction phase, ensuring consistent batch strength.",
      image: import.meta.env.BASE_URL + "products/Dr lion Pain pills/Pain_pills.webp"
    },
    {
      title: "Hygienic Production Process",
      desc: "Our facility maintains clean environments, ensuring all machinery and tools undergo strict cleaning checks between batches. We enforce strict hygiene and quality management practices across our entire supply chain.",
      image: import.meta.env.BASE_URL + "products/Dr lion pain cream/Pain cream front view.webp"
    },
    {
      title: "Quality Assurance & Lab Checks",
      desc: "We enforce rigorous validation guidelines. From agricultural sourcing to final extraction, every step is monitored to deliver consistent Ayurvedic formulations that support natural healing and musculoskeletal wellness.",
      image: import.meta.env.BASE_URL + "products/Moon-light/Moon cream front view.webp"
    }
  ];

  const certificates = [
    {
      title: "Government Ayurvedic Drug License",
      authority: "Licensing Authority of Andhra Pradesh",
      desc: "Official authorization code R-1970/Ayur to manufacture proprietary Ayurvedic medicines and external applications.",
      ref: "AYUSH State Department Certified"
    },
    {
      title: "Good Manufacturing Practices (GMP)",
      authority: "Quality Control Audited Facility",
      desc: "Complies with statutory sanitary audits, ventilation layouts, sterile batch testing, and staff training protocols.",
      ref: "Schedule T Ayurvedic Standards"
    },
    {
      title: "Lab Testing & Standardization",
      authority: "Physico-Chemical Analysis Board",
      desc: "Every batch undergoes rigorous quality assurance tests to verify botanical identification, moisture content, and purity metrics.",
      ref: "Purity & Identity Verified"
    }
  ];

  const handleNextCert = () => {
    setActiveCert((prev) => (prev + 1) % certificates.length);
  };

  const handlePrevCert = () => {
    setActiveCert((prev) => (prev - 1 + certificates.length) % certificates.length);
  };

  return (
    <div className="manufacturing-page">
      <SEO
        title="Licensed Manufacturing & Quality Control - S.S. PHARMACY"
        description="Our licensed manufacturing facility in Yerraguntla Kadapa AP operates under GMP guidelines and strict hygiene quality control checks."
        canonical="https://sspharmacy.com/manufacturing"
      />
      
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Manufacturing' }]} className="mb-6" />
          <div className="manufacturing-header-block text-left">
            <SectionHeader
              eyebrow="Our Standards"
              title="Licensed Manufacturing & Quality Control"
              subtitle="S.S. PHARMACY operates under the licensed jurisdiction code R-1970/Ayur, enforcing strict hygiene and quality management practices."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Process Grid: Alternating Staggered Layout */}
      <Section className="pb-16 pt-4">
        <Container>
          <div className="manufacturing-staggered-list mt-8">
            {standards.map((std, i) => (
              <div
                key={i}
                className={`manufacturing-row ${
                  i % 2 === 1 ? 'manufacturing-row-reverse' : ''
                }`}
              >
                {/* Text Block */}
                <div className="flex-1 text-left">
                  <span className="pillar-eyebrow">
                    Pillar 0{i + 1}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-brand-primary mt-2 mb-4">
                    {std.title}
                  </h3>
                  <p className="text-secondary text-sm md:text-md leading-relaxed">
                    {std.desc}
                  </p>
                  
                  {i === 1 && (
                    <div className="manufacturing-license-highlight">
                      <div className="license-icon-box">
                        <Factory size={18} />
                      </div>
                      <div className="license-text-box">
                        <h5>Govt. Approved Ayurvedic Unit</h5>
                        <p>License number R-1970/Ayur ensures compliance with regulatory requirements.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Block (Zoom on Hover Card) */}
                <div className="manufacturing-row-visual-shell">
                  <CleanCard variant="default" innerClassName="manufacturing-visual-container">
                    <img
                      src={std.image}
                      alt={std.title}
                      className="manufacturing-main-image"
                      width={400}
                      height={220}
                      loading="lazy"
                      decoding="async"
                    />
                  </CleanCard>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* 3. Dedicated Certificates Carousel Section */}
      <Section className="certificates-carousel-section border-t border-hairline py-20 bg-surface">
        <Container>
          <div className="mb-10 text-center">
            <span className="eyebrow-badge">Certifications</span>
            <h2 className="text-3xl font-display text-brand-primary mt-2">Compliance & Licensing</h2>
            <p className="text-secondary text-sm max-w-lg mx-auto mt-2">
              Our Andhra Pradesh facility is fully audited and registered under regional and global quality management boards.
            </p>
          </div>

          <div className="relative max-w-[650px] mx-auto mt-12">
            {/* Carousel Pane */}
            <div className="certificate-slide-viewport overflow-hidden">
              <div className="certificate-card-wrapper">
                <CleanCard variant="default" innerClassName="certificate-card-inner">
                  <div className="certificate-card-content">
                    <div className="certificate-icon-box">
                      <Award size={32} />
                    </div>
                    <h3 className="certificate-title">
                      {certificates[activeCert].title}
                    </h3>
                    <span className="certificate-authority">
                      {certificates[activeCert].authority}
                    </span>
                    <p className="certificate-desc">
                      {certificates[activeCert].desc}
                    </p>
                  </div>
                  
                  <div className="certificate-footer">
                    <span className="certificate-ref">
                      {certificates[activeCert].ref}
                    </span>
                  </div>
                </CleanCard>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                type="button"
                onClick={handlePrevCert}
                className="carousel-control-btn"
                aria-label="Previous Certificate"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextCert}
                className="carousel-control-btn"
                aria-label="Next Certificate"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
