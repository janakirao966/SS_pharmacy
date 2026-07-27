import { Shield, Sparkles, MapPin, HeartHandshake, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';
import TrustBadgesBar from '../components/ui/TrustBadgesBar';

export default function About() {
  return (
    <div className="about-page bg-[#FEFDF8]">
      <SEO
        title="About Us - S.S. PHARMACY"
        description="Learn about S.S. PHARMACY's legacy, government approved Ayurvedic manufacturing License R-1970/Ayur, and our core principles of authenticity and quality."
        canonical="https://sspharmacy.com/about"
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "S.S. PHARMACY",
          "url": "https://sspharmacy.com/about",
          "logo": "https://sspharmacy.com/products/logo/logo.webp",
          "description": "Premium government-licensed Ayurvedic manufacturer in Yerraguntla, Kadapa District, Andhra Pradesh.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "D. No. 1-2-211 & 1-2-212, Prakash Nagar, Yerraguntla Panchayati",
            "addressLocality": "YSR Kadapa District",
            "addressRegion": "Andhra Pradesh",
            "postalCode": "516309",
            "addressCountry": "IN"
          }
        }}
      />
      {/* 1. Hero Header & Trust Badges Bar */}
      <Section className="pt-page-header pb-12 bg-gradient-to-b from-[#F9F6EE] via-[#FEFDF8] to-[#FEFDF8] border-b border-[#E8E2D2]">
        <Container>
          <Breadcrumbs items={[{ label: 'About Us' }]} className="mb-6" />
          <div className="about-header-block max-w-3xl">
            <SectionHeader
              eyebrow="Our Heritage & Vision"
              title="Rooted in Ayurvedic Tradition, Driven by Quality"
              subtitle="S.S. PHARMACY manufactures authentic Ayurvedic formulations and herbal remedies designed to support long-term health, joint mobility, and skin comfort."
              align="left"
              isPageHeader
            />
          </div>

          {/* 5 Verified Trust Credentials Bar */}
          <TrustBadgesBar className="mt-8" />
        </Container>
      </Section>

      {/* 2. Brand Story / Storytelling */}
      <Section className="about-story-section py-14 md:py-20">
        <Container>
          <div className="about-story-grid grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">
            {/* Story Visual Box */}
            <div className="lg:col-span-5 story-image-block">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#D9C8A9] shadow-xl bg-white group">
                <img
                  src={`${import.meta.env.BASE_URL}products/Moon-light/Moon cream Hero_section.webp`}
                  alt="Ayurvedic herbs and formulation process at S.S. Pharmacy"
                  className="w-full h-[380px] md:h-[440px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1D3A28]/85 via-[#1D3A28]/30 to-transparent flex items-end p-6 md:p-8">
                  <div className="text-white space-y-1">
                    <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#1D3A28]/80 border border-[#C5A059]/40 rounded-md backdrop-blur-sm">
                      Ayurvedic Manufacturing Facility
                    </span>
                    <h4 className="font-display text-xl text-white font-bold tracking-wide">Yerraguntla Unit, Andhra Pradesh</h4>
                    <p className="text-xs text-slate-200 font-sans">Mfg. License Code: R-1970/Ayur</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Story Text Content */}
            <div className="lg:col-span-7 story-text-block space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D3A28]/10 text-[#1D3A28] border border-[#1D3A28]/20 text-xs font-semibold">
                <FileCheck size={14} className="text-[#C5A059]" />
                <span>Company Profile & Statutory Credentials</span>
              </div>

              <h2 className="font-display text-3xl md:text-4xl text-[#1D3A28] leading-tight font-bold">
                One-Stop Solution for Authentic Ayurvedic Remedies
              </h2>
              
              <p className="text-secondary text-base leading-relaxed">
                Established with a firm commitment to making the healing benefits of classical Ayurveda reliable and accessible, S.S. PHARMACY formulates proprietary Ayurvedic preparations tailored to everyday wellness needs. From joint pain relief to skin vitality, our products are crafted under strict quality parameters.
              </p>

              <p className="text-secondary text-base leading-relaxed">
                Operating out of our licensed facility in Yerraguntla, Kadapa District, Andhra Pradesh (License No. <strong>R-1970/Ayur</strong>), we strictly monitor raw botanical sourcing, batch processing, hygiene, and safe packaging standards.
              </p>

              {/* Statutory License Card */}
              <div className="about-license-card bg-gradient-to-r from-[#F5EFE3] via-[#FEFDF8] to-[#F5EFE3] p-5 md:p-6 rounded-2xl border border-[#D9C8A9] shadow-sm flex items-start gap-4 mt-6 hover:shadow-md transition-shadow">
                <div className="license-badge-icon w-12 h-12 rounded-xl bg-[#1D3A28] text-[#C5A059] flex items-center justify-center shrink-0 shadow-sm border border-[#C5A059]/30">
                  <ShieldCheck size={26} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-[#1D3A28] text-base md:text-lg">Government Licensed Ayurvedic Unit</h3>
                    <span className="bg-[#C5A059]/20 text-[#7A6027] text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-[#C5A059]/40 uppercase tracking-wider">
                      Approved
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                    Mfg. License No. <strong className="text-[#1D3A28]">R-1970/Ayur</strong> | Issued by the Licensing Authority of Andhra Pradesh for Ayurvedic Proprietary Medicines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 3. Core Values Grid */}
      <Section className="py-14 md:py-20 bg-gradient-to-b from-[#F9F6EE] to-[#FEFDF8] border-y border-[#E8E2D2]">
        <Container>
          <SectionHeader
            eyebrow="Foundational Principles"
            title="Our Guiding Core Values"
            subtitle="The fundamental pillars steering research, batch processing, and distribution across India."
          />

          <Grid cols={3} gap="lg" className="values-grid mt-12">
            <CleanCard variant="default" className="h-full border border-[#D9C8A9]/70 hover:border-[#C5A059] transition-all duration-300 hover:shadow-lg group">
              <div className="value-card p-4 flex flex-col h-full">
                <div className="value-icon-box w-12 h-12 rounded-xl bg-[#1D3A28] text-[#C5A059] flex items-center justify-center mb-5 shadow-xs border border-[#C5A059]/30 group-hover:scale-105 group-hover:bg-[#2D5016] transition-all">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-display text-xl text-[#1D3A28] font-bold group-hover:text-[#2D5016] transition-colors">Authenticity</h3>
                <p className="mt-3 text-secondary text-sm leading-relaxed">
                  We strictly source genuine herbal raw materials and utilize traditional Ayurvedic formulation rules to maintain batch strength and purity.
                </p>
              </div>
            </CleanCard>

            <CleanCard variant="default" className="h-full border border-[#D9C8A9]/70 hover:border-[#C5A059] transition-all duration-300 hover:shadow-lg group">
              <div className="value-card p-4 flex flex-col h-full">
                <div className="value-icon-box w-12 h-12 rounded-xl bg-[#1D3A28] text-[#C5A059] flex items-center justify-center mb-5 shadow-xs border border-[#C5A059]/30 group-hover:scale-105 group-hover:bg-[#2D5016] transition-all">
                  <Shield size={24} />
                </div>
                <h3 className="font-display text-xl text-[#1D3A28] font-bold group-hover:text-[#2D5016] transition-colors">Quality Assurance</h3>
                <p className="mt-3 text-secondary text-sm leading-relaxed">
                  Every production lot undergoes rigorous hygiene checks, sterile packaging protocols, and standardized quality validation before distribution.
                </p>
              </div>
            </CleanCard>

            <CleanCard variant="default" className="h-full border border-[#D9C8A9]/70 hover:border-[#C5A059] transition-all duration-300 hover:shadow-lg group">
              <div className="value-card p-4 flex flex-col h-full">
                <div className="value-icon-box w-12 h-12 rounded-xl bg-[#1D3A28] text-[#C5A059] flex items-center justify-center mb-5 shadow-xs border border-[#C5A059]/30 group-hover:scale-105 group-hover:bg-[#2D5016] transition-all">
                  <HeartHandshake size={24} />
                </div>
                <h3 className="font-display text-xl text-[#1D3A28] font-bold group-hover:text-[#2D5016] transition-colors">Responsible Wording</h3>
                <p className="mt-3 text-secondary text-sm leading-relaxed">
                  We practice honest communication. We avoid unverified medical claims and present wellness benefits accurately according to regulations.
                </p>
              </div>
            </CleanCard>
          </Grid>
        </Container>
      </Section>

      {/* 4. Geography / Facility Location Details */}
      <Section className="about-location-section py-14 md:py-20">
        <Container>
          <div className="about-location-grid grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">
            <div className="lg:col-span-6 location-info-block space-y-5">
              <span className="eyebrow-badge bg-[#C5A059]/15 text-[#7A6027] border border-[#C5A059]/30">Facility Headquarters</span>
              <h2 className="font-display text-3xl md:text-4xl text-[#1D3A28] font-bold">Manufacturing Base in Andhra Pradesh</h2>
              <p className="text-secondary text-base leading-relaxed">
                Our state-approved manufacturing plant is located in Yerraguntla, Kadapa District, Andhra Pradesh. This hub manages raw material processing, quality control testing, batch bottling, and regional distribution dispatch.
              </p>
              
              <div className="location-detail-row mt-6 p-5 rounded-2xl bg-[#F9F6EE] border border-[#D9C8A9]/70 flex items-start space-x-4 shadow-sm">
                <div className="p-3 rounded-xl bg-[#1D3A28] text-[#C5A059] shrink-0 mt-0.5 shadow-xs border border-[#C5A059]/30">
                  <MapPin size={22} />
                </div>
                <address className="location-address not-italic">
                  <h3 className="address-title font-display text-base font-bold text-[#1D3A28]">S.S. PHARMACY Manufacturing Unit</h3>
                  <p className="address-desc text-slate-600 text-sm mt-1.5 leading-relaxed font-sans">
                    D. No. 1-2-211 and 1-2-212, Prakash Nagar,<br />
                    Yerraguntla Panchayati, YSR Kadapa District,<br />
                    Andhra Pradesh - 516309, India
                  </p>
                </address>
              </div>
            </div>

            <div className="lg:col-span-6 location-visual-block">
              <div className="w-full rounded-2xl overflow-hidden border-2 border-[#D9C8A9] shadow-xl bg-white group flex flex-col">
                <div className="relative w-full h-[240px] md:h-[280px] overflow-hidden bg-slate-100">
                  <img
                    src="https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=900&height=420&center=lonlat:78.571027,14.755504&zoom=14&marker=lonlat:78.571027,14.755504;color:%232d5016;size:medium&apiKey=34036dd1e9ed4badb10aed72da04affb"
                    alt="S.S. PHARMACY Manufacturing Facility Map"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 sm:p-5 bg-white border-t border-[#E8E2D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-pulse flex-shrink-0" />
                    <div>
                      <h3 className="font-display text-xs font-bold text-[#1D3A28]">Registered Unit Location</h3>
                      <p className="text-[11px] text-slate-500 font-sans">Yerraguntla, Kadapa Dist, AP - 516309</p>
                    </div>
                  </div>
                  <a
                    href="https://maps.app.goo.gl/UwgF81SSMDMUAEFV8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1D3A28] text-white text-xs font-bold rounded-xl hover:bg-[#2D5016] shadow-sm transition-all duration-200 min-h-[44px] w-full sm:w-auto"
                  >
                    <MapPin size={14} className="text-[#C5A059]" />
                    <span>Open Maps Directions &rarr;</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 5. Bottom Conversion CTA Banner */}
      <Section className="about-cta-section bg-[#1D3A28] text-white py-16 border-t-2 border-[#C5A059]">
        <Container>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
            <div>
              <span className="eyebrow-badge bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 mb-3 inline-block font-bold">Partner With S.S. PHARMACY</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white mt-1">Looking for Wholesale or Distributorship?</h2>
              <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                We partner with medical shops, clinics, hospitals, and regional wholesale buyers. Gain exclusive regional distribution rights and full compliance collateral support.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
              <a
                href={`${import.meta.env.BASE_URL}distributor`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#C5A059] text-[#1D3A28] font-bold rounded-xl hover:bg-[#d4b06a] transition-all min-h-[44px] shadow-md text-sm"
              >
                <span>Apply for Distributorship</span>
                <ArrowRight size={16} />
              </a>
              <a
                href={`${import.meta.env.BASE_URL}products`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 border border-white/20 transition-all min-h-[44px] text-sm"
              >
                View Product Range
              </a>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

