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
      image: "/products/Dr lion Pain pills/Pain_pills.webp"
    },
    {
      title: "Hygienic Production Process",
      desc: "Our facility maintains clean environments, ensuring all machinery and tools undergo strict cleaning checks between batches. We enforce strict hygiene and quality management practices across our entire supply chain.",
      image: "/products/Dr lion pain cream/Pain cream front view.webp"
    },
    {
      title: "Quality Assurance & Lab Checks",
      desc: "We enforce rigorous validation guidelines. From agricultural sourcing to final extraction, every step is monitored to deliver consistent Ayurvedic formulations that support natural healing and musculoskeletal wellness.",
      image: "/products/Moon-light/Moon cream front view.webp"
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
                className={`flex flex-col md:flex-row items-center gap-12 mb-20 ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Text Block */}
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B6914] font-bold">
                    Pillar 0{i + 1}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-brand-primary mt-2 mb-4">
                    {std.title}
                  </h3>
                  <p className="text-secondary text-sm md:text-md leading-relaxed">
                    {std.desc}
                  </p>
                  
                  {i === 1 && (
                    <div className="manufacturing-license-highlight mt-6 flex items-start space-x-4 bg-surface p-4 rounded-xl border border-hairline">
                      <div className="license-icon-box text-gold mt-0.5">
                        <Factory size={18} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-brand-primary text-sm">Govt. Approved Ayurvedic Unit</h5>
                        <p className="text-[#6E6863] text-xs mt-1">License number R-1970/Ayur ensures compliance with regulatory requirements.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Block (Zoom on Hover Card) */}
                <div className="w-full md:w-[450px]">
                  <CleanCard variant="default" innerClassName="manufacturing-visual-container p-6 bg-white flex items-center justify-center h-[280px]">
                    <img
                      src={std.image}
                      alt={std.title}
                      className="manufacturing-main-image max-h-[220px] object-contain hover:scale-105 transition-transform duration-500"
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
              <div className="certificate-card-wrapper transition-all duration-300">
                <CleanCard variant="default" className="transform hover:scale-[1.03] transition-transform duration-300">
                  <div className="p-8 text-center bg-white rounded-2xl flex flex-col items-center min-h-[300px] justify-between">
                    <div className="flex flex-col items-center">
                      <div className="certificate-icon-box text-gold mb-6 bg-[#FAF8F5] p-4 rounded-full border border-gold/30">
                        <Award size={36} />
                      </div>
                      <h3 className="font-display text-xl font-bold text-brand-primary mb-2">
                        {certificates[activeCert].title}
                      </h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-secondary font-bold block mb-4">
                        {certificates[activeCert].authority}
                      </span>
                      <p className="text-secondary text-sm leading-relaxed max-w-md">
                        {certificates[activeCert].desc}
                      </p>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-hairline w-full">
                      <span className="text-xs font-mono text-[#8B6914] font-semibold">
                        {certificates[activeCert].ref}
                      </span>
                    </div>
                  </div>
                </CleanCard>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                type="button"
                onClick={handlePrevCert}
                className="p-3 rounded-full border border-[#EBE6DC] bg-white hover:bg-[#FAF8F5] text-brand-primary transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                aria-label="Previous Certificate"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextCert}
                className="p-3 rounded-full border border-[#EBE6DC] bg-white hover:bg-[#FAF8F5] text-brand-primary transition-all active:scale-95 cursor-pointer flex items-center justify-center"
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
