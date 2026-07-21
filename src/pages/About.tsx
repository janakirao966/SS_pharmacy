import { Shield, Sparkles, MapPin, HeartHandshake } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function About() {
  return (
    <div className="about-page">
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
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'About Us' }]} className="mb-6" />
          <div className="about-header-block">
            <SectionHeader
              eyebrow="Our Legacy"
              title="Rooted in Tradition, Committed to Quality"
              subtitle="S.S. PHARMACY manufactures authentic Ayurvedic medicines and herbal healthcare solutions to support everyday wellness and comfort."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Brand Story / Storytelling */}
      <Section className="about-story-section pb-16 pt-4">
        <Container>
          <div className="about-story-grid">
            <div className="story-image-block">
              <CleanCard variant="default" innerClassName="story-image-container">
                <img
                  src={`${import.meta.env.BASE_URL}products/Moon-light/Moon cream Hero_section.webp`}
                  alt="Ayurvedic ingredients formulation"
                  className="story-visual-image"
                  width={600}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
              </CleanCard>
            </div>
            
            <div className="story-text-block">
              <h2 className="font-display text-3xl text-brand-primary">One Step Solution</h2>
              <p className="mt-4 text-secondary">
                Established with a vision to make the healing benefits of Ayurveda accessible and reliable, S.S. PHARMACY manufactures products designed around consumer needs. From pain management to skin health, our remedies offer a holistic path to wellness.
              </p>
              <p className="mt-4 text-secondary">
                Our manufacturing operations are based in Yerraguntla, Andhra Pradesh. Licensed under code <strong>R-1970/Ayur</strong>, we ensure that every batch is manufactured in clean, quality-controlled conditions using high-quality herbal ingredients.
              </p>
              
              <div className="about-license-card">
                <div className="license-badge-icon text-[#9B7B35]">
                  <Shield size={20} />
                </div>
                <div>
                  <h6 className="font-semibold text-brand-primary">Government Licensed Manufacturing</h6>
                  <p className="text-secondary text-sm mt-1">License No. R-1970/Ayur | Approved Ayurvedic Segment</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 3. Core Values Grid */}
      <Section className="pb-16 pt-8">
        <Container>
          <SectionHeader
            eyebrow="Principles"
            title="Our Core Values"
            subtitle="The foundations guiding S.S. PHARMACY's research, manufacturing, and distribution."
          />

          <Grid cols={3} gap="lg" className="values-grid mt-12">
            <CleanCard variant="default">
              <div className="value-card p-0">
                <div className="value-icon-box text-gold mb-4">
                  <Sparkles size={24} />
                </div>
                <h4 className="font-display text-lg text-brand-primary">Authenticity</h4>
                <p className="mt-2 text-secondary text-sm leading-relaxed">
                  We source authentic herbal ingredients and employ traditional Ayurvedic extraction methodologies to ensure formulation integrity.
                </p>
              </div>
            </CleanCard>

            <CleanCard variant="default">
              <div className="value-card p-0">
                <div className="value-icon-box text-gold mb-4">
                  <Shield size={24} />
                </div>
                <h4 className="font-display text-lg text-brand-primary">Quality Standards</h4>
                <p className="mt-2 text-secondary text-sm leading-relaxed">
                  We follow quality-focused manufacturing practices, safe packaging standards, and authentic QA checks to ensure batch consistency.
                </p>
              </div>
            </CleanCard>

            <CleanCard variant="default">
              <div className="value-card p-0">
                <div className="value-icon-box text-gold mb-4">
                  <HeartHandshake size={24} />
                </div>
                <h4 className="font-display text-lg text-brand-primary">Responsible Wording</h4>
                <p className="mt-2 text-secondary text-sm leading-relaxed">
                  We practice honest communication. We avoid disease-cure claims and communicate the wellness-supporting benefits of our products responsibly.
                </p>
              </div>
            </CleanCard>
          </Grid>
        </Container>
      </Section>

      {/* 4. Geography / Facility Details */}
      <Section className="about-location-section pb-24 pt-8">
        <Container>
          <div className="about-location-grid">
            <div className="location-info-block">
              <span className="eyebrow-badge">Headquarters</span>
              <h2 className="font-display text-3xl text-brand-primary mt-2">Located in Andhra Pradesh</h2>
              <p className="mt-4 text-secondary">
                Our licensed manufacturing facility is located in Yerraguntla, Kadapa District, Andhra Pradesh. This location handles our research, batch processing, packaging, quality control, and distribution dispatch operations.
              </p>
              <div className="location-detail-row mt-6 flex items-start space-x-3">
                <MapPin className="text-gold mt-1 flex-shrink-0" size={18} />
                <address className="location-address not-italic">
                  <h5 className="address-title font-display text-base font-semibold text-brand-primary">Manufacturing Facility</h5>
                  <p className="address-desc text-secondary text-sm mt-1 leading-relaxed">
                    D. No. 1-2-211 and 1-2-212, Prakash Nagar,<br />
                    Yerraguntla Panchayati, YSR Kadapa District,<br />
                    Andhra Pradesh - 516309
                  </p>
                </address>
              </div>
            </div>

            <div className="location-visual-block">
              <CleanCard variant="default" innerClassName="map-placeholder">
                <div className="map-icon-pulse">
                  <MapPin size={32} />
                </div>
                <span className="mt-4 text-secondary text-sm font-semibold">Kadapa, Andhra Pradesh</span>
              </CleanCard>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
