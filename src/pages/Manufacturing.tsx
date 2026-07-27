import { useState } from 'react';
import { Award, Factory, ChevronLeft, ChevronRight, CheckCircle2, Shield, Sparkles, ArrowRight } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import SEO from '../components/ui/SEO';

export default function Manufacturing() {
  const [activeCert, setActiveCert] = useState(0);

  const standards = [
    {
      pillar: "Pillar 01",
      title: "Authentic Formulation Sourcing",
      desc: "Our formulations adhere strictly to classic Ayurvedic recipes and time-tested herbal ratios. Every raw herb undergoes physical, identity, and moisture checks before entering processing to ensure uniform batch strength.",
      image: import.meta.env.BASE_URL + "products/Dr lion Pain pills/Pain_pills.webp"
    },
    {
      pillar: "Pillar 02",
      title: "Hygienic Production Process",
      desc: "Our facility operates in sanitized, climate-controlled environments. Equipment and processing vessels undergo mandatory cleaning and sterilization checks between batches to maintain statutory purity standards.",
      image: import.meta.env.BASE_URL + "products/Dr lion pain cream/Pain cream front view.webp"
    },
    {
      pillar: "Pillar 03",
      title: "Quality Assurance & Lab Validation",
      desc: "We enforce multi-tiered validation checks. From raw botanical extraction to final bottle seals, every batch is tested to confirm identification metrics, safety, and consistent therapeutic support.",
      image: import.meta.env.BASE_URL + "products/Moon-light/Moon cream front view.webp"
    }
  ];

  const certificates = [
    {
      title: "Government Ayurvedic Drug License",
      authority: "Licensing Authority of Andhra Pradesh",
      desc: "Official statutory code R-1970/Ayur authorizing the manufacture of proprietary Ayurvedic medicines and external applications.",
      ref: "AYUSH Department State Registration"
    },
    {
      title: "Good Manufacturing Practices (GMP)",
      authority: "Quality Control Audited Unit",
      desc: "Complies with Schedule T Ayurvedic sanitary protocols, cleanroom air filtering, equipment sterilization, and staff hygiene rules.",
      ref: "Schedule T Ayurvedic Compliance"
    },
    {
      title: "Physico-Chemical Quality Testing",
      authority: "Botanical QA & Standardization Board",
      desc: "Every batch undergoes rigorous quality assurance checks verifying botanical identity, heavy metal limits, and moisture parameters.",
      ref: "Purity & Safety Verified"
    }
  ];

  const handleNextCert = () => {
    setActiveCert((prev) => (prev + 1) % certificates.length);
  };

  const handlePrevCert = () => {
    setActiveCert((prev) => (prev - 1 + certificates.length) % certificates.length);
  };

  return (
    <div className="manufacturing-page bg-[#FEFDF8]">
      <SEO
        title="Licensed Manufacturing & Quality Control - S.S. PHARMACY"
        description="Our licensed manufacturing facility in Yerraguntla Kadapa AP operates under GMP guidelines and strict hygiene quality control checks."
        canonical="https://sspharmacy.com/manufacturing"
      />
      
      {/* 1. Hero Header & Trust Badges */}
      <Section className="pt-page-header pb-10 bg-gradient-to-b from-[#F9F6EE] to-[#FEFDF8] border-b border-[#E8E2D2]">
        <Container>
          <Breadcrumbs items={[{ label: 'Manufacturing' }]} className="mb-6" />
          <div className="manufacturing-header-block max-w-3xl">
            <SectionHeader
              eyebrow="Facility Standards & Protocol"
              title="Licensed Manufacturing & Quality Assurance"
              subtitle="S.S. PHARMACY operates under government manufacturing code R-1970/Ayur in Andhra Pradesh, enforcing strict hygiene and quality management practices."
              align="left"
              isPageHeader
            />
          </div>

          {/* Trust Metrics / 5 Verified Claims Bar */}
          <div className="manufacturing-trust-bar grid grid-cols-2 md:grid-cols-5 gap-3 mt-8 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#D9C8A9] shadow-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EFE3] border border-[#D9C8A9]/50">
              <Award className="text-[#C5A059] shrink-0" size={22} />
              <div>
                <h6 className="text-xs font-bold text-[#1D3A28] leading-tight">GMP Certified</h6>
                <p className="text-[11px] text-secondary leading-none mt-0.5">Audited Facility</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EFE3] border border-[#D9C8A9]/50">
              <Factory className="text-[#C5A059] shrink-0" size={22} />
              <div>
                <h6 className="text-xs font-bold text-[#1D3A28] leading-tight">Govt. License</h6>
                <p className="text-[11px] text-secondary leading-none mt-0.5">R-1970/Ayur</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EFE3] border border-[#D9C8A9]/50">
              <Sparkles className="text-[#C5A059] shrink-0" size={22} />
              <div>
                <h6 className="text-xs font-bold text-[#1D3A28] leading-tight">100% Herbal</h6>
                <p className="text-[11px] text-secondary leading-none mt-0.5">Pure Botanicals</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EFE3] border border-[#D9C8A9]/50">
              <CheckCircle2 className="text-[#C5A059] shrink-0" size={22} />
              <div>
                <h6 className="text-xs font-bold text-[#1D3A28] leading-tight">Tested Safety</h6>
                <p className="text-[11px] text-secondary leading-none mt-0.5">Lab Validated</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EFE3] border border-[#D9C8A9]/50 col-span-2 md:col-span-1">
              <Shield className="text-[#C5A059] shrink-0" size={22} />
              <div>
                <h6 className="text-xs font-bold text-[#1D3A28] leading-tight">Zero Harm</h6>
                <p className="text-[11px] text-secondary leading-none mt-0.5">Non-Toxic Formula</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 2. Process Grid: Alternating Staggered Layout */}
      <Section className="py-12 md:py-16">
        <Container>
          <div className="manufacturing-staggered-list space-y-12">
            {standards.map((std, i) => (
              <div
                key={i}
                className={`manufacturing-row grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${
                  i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Block */}
                <div className={`lg:col-span-7 space-y-3 ${i % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}`}>
                  <span className="eyebrow-badge bg-[#1D3A28]/10 text-[#1D3A28] border border-[#1D3A28]/20">
                    {std.pillar}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-[#1D3A28] font-semibold mt-2">
                    {std.title}
                  </h3>
                  <p className="text-secondary text-base leading-relaxed">
                    {std.desc}
                  </p>
                  
                  {i === 1 && (
                    <div className="about-license-card bg-gradient-to-r from-[#F5EFE3] to-[#FEFDF8] p-4 rounded-xl border border-[#D9C8A9] flex items-center gap-3 mt-4">
                      <div className="w-10 h-10 rounded-full bg-[#1D3A28] text-[#C5A059] flex items-center justify-center shrink-0">
                        <Factory size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-[#1D3A28] text-sm">Govt. Approved Ayurvedic Facility</h5>
                        <p className="text-xs text-secondary mt-0.5">Mfg. Lic. R-1970/Ayur guarantees strict statutory compliance and batch safety.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Block */}
                <div className={`lg:col-span-5 ${i % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="rounded-2xl overflow-hidden border-2 border-[#D9C8A9] shadow-md bg-white group">
                    <img
                      src={std.image}
                      alt={std.title}
                      className="w-full h-[240px] md:h-[280px] object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* 3. Dedicated Certificates Carousel Section */}
      <Section className="certificates-carousel-section border-t border-[#E8E2D2] py-14 bg-[#F9F6EE]">
        <Container>
          <div className="mb-10 text-center max-w-xl mx-auto">
            <span className="eyebrow-badge bg-[#C5A059]/20 text-[#7A6027] border border-[#C5A059]/40">Statutory Compliance</span>
            <h2 className="text-3xl font-display text-[#1D3A28] mt-2">Licensing & Quality Certifications</h2>
            <p className="text-secondary text-sm mt-2">
              Our Yerraguntla plant is registered and audited under State Licensing Authority regulations.
            </p>
          </div>

          <div className="relative max-w-2xl mx-auto mt-8">
            {/* Carousel Pane (SF6-011 Accessible Live Region) */}
            <div className="certificate-slide-viewport overflow-hidden rounded-2xl border-2 border-[#D9C8A9] bg-white p-8 shadow-md" aria-live="polite" aria-atomic="true" role="region" aria-label="Statutory Certificate Slide">
              <div className="certificate-card-content text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1D3A28] text-[#C5A059] flex items-center justify-center mx-auto shadow-sm">
                  <Award size={36} />
                </div>
                <h3 className="text-2xl font-display font-semibold text-[#1D3A28]">
                  {certificates[activeCert].title}
                </h3>
                <span className="inline-block bg-[#1D3A28]/10 text-[#1D3A28] text-xs font-bold px-3 py-1 rounded-full border border-[#1D3A28]/20">
                  {certificates[activeCert].authority}
                </span>
                <p className="text-secondary text-sm leading-relaxed max-w-lg mx-auto">
                  {certificates[activeCert].desc}
                </p>
                <div className="pt-4 border-t border-[#E8E2D2]">
                  <span className="text-xs font-mono font-semibold text-[#7A6027] uppercase tracking-wider">
                    {certificates[activeCert].ref}
                  </span>
                </div>
              </div>
            </div>

            {/* Carousel Controls & Position Indicator */}
            <div className="flex flex-col items-center gap-3 mt-8">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handlePrevCert}
                  className="carousel-control-btn min-h-[44px] min-w-[44px] rounded-full border border-[#D9C8A9] bg-white text-[#1D3A28] hover:bg-[#1D3A28] hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059] flex items-center justify-center"
                  aria-label="Previous Certificate"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-[#D9C8A9] text-xs font-semibold text-[#1D3A28] shadow-xs">
                  <span>Certificate {activeCert + 1} of {certificates.length}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextCert}
                  className="carousel-control-btn min-h-[44px] min-w-[44px] rounded-full border border-[#D9C8A9] bg-white text-[#1D3A28] hover:bg-[#1D3A28] hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059] flex items-center justify-center"
                  aria-label="Next Certificate"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-2 mt-1">
                {certificates.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCert(idx)}
                    className={`h-3 rounded-full transition-all ${
                      activeCert === idx ? 'bg-[#1D3A28] w-6' : 'bg-slate-300 hover:bg-slate-400 w-3'
                    }`}
                    aria-label={`Go to certificate ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 4. Bottom Conversion CTA Banner */}
      <Section className="manufacturing-cta-section bg-[#1D3A28] text-white py-14 border-t-2 border-[#C5A059]">
        <Container>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
            <div>
              <span className="eyebrow-badge bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 mb-2 inline-block">Wholesale Supply</span>
              <h3 className="font-display text-2xl md:text-3xl text-white mt-1">Need Licensed Bulk Ayurvedic Products?</h3>
              <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-xl">
                Partner with S.S. PHARMACY for reliable, batch-tested Ayurvedic supply for clinics, medical stores, and regional stockists.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
              <a
                href={`${import.meta.env.BASE_URL}distributor`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-[#1D3A28] font-semibold rounded-xl hover:bg-[#d4b06a] transition-all min-h-[44px] shadow-sm text-sm"
              >
                <span>Become a Distributor</span>
                <ArrowRight size={16} />
              </a>
              <a
                href={`${import.meta.env.BASE_URL}contact`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 border border-white/20 transition-all min-h-[44px] text-sm"
              >
                Contact Facility
              </a>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
