import { Plant, Certificate, ShieldCheck, Flask, Leaf, Factory, Handshake } from '@phosphor-icons/react';
import { products } from '../data/products';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Button from '../components/ui/Button';
import ProductCard from '../components/cards/ProductCard';
import HeroCarousel from '../components/ui/HeroCarousel';
import SEO from '../components/ui/SEO';
import ScrollReveal from '../components/ui/ScrollReveal';

interface HomeProps {
  setActiveTab: (tab: string) => void;
  setSelectedProductId: (id: string) => void;
}

export default function Home({ setActiveTab, setSelectedProductId }: HomeProps) {
  const handleProductClick = (id: string) => {
    setSelectedProductId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="home-page">
      <SEO
        title="AYU S.S. PHARMACY - Authentic Ayurvedic Quality"
        description="S.S. PHARMACY official online presence. Premium government-licensed Ayurvedic manufacturer located in Yerraguntla, Kadapa District, Andhra Pradesh."
        canonical="https://sspharmacy.com/"
        ogImage="https://sspharmacy.com/products/logo/logo.webp"
        schema={{
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "name": "S.S. PHARMACY",
          "image": "https://sspharmacy.com/products/logo/logo.webp",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "D. No. 1-2-211 & 1-2-212, Prakash Nagar, Yerraguntla Panchayati",
            "addressLocality": "YSR Kadapa District",
            "addressRegion": "Andhra Pradesh",
            "postalCode": "516309",
            "addressCountry": "IN"
          },
          "telephone": "+919494323211",
          "priceRange": "$$",
          "knowsAbout": ["Ayurveda", "Ayurvedic proprietary medicine", "Pain relief cream"],
          "license": "R-1970/Ayur",
          "url": "https://sspharmacy.com/",
          "sameAs": [
            "https://www.linkedin.com/company/ss-pharmacy",
            "https://twitter.com/ss_pharmacy"
          ]
        }}
      />
 
      {/* 1. Full-Width Hero Image Carousel */}
      <HeroCarousel 
        setActiveTab={setActiveTab} 
        setSelectedProductId={setSelectedProductId} 
      />

      {/* 2. Feature Highlights Panel (Sleek Horizontal 4-Column Panel) */}
      <section className="feature-highlights-section">
        <Container>
          <div className="feature-highlights-panel">
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Plant size={22} weight="duotone" />
              </div>
              <div className="feature-highlight-info">
                <h4>Pure Ayurveda</h4>
                <p>Authentic &amp; Natural</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Leaf size={22} weight="duotone" />
              </div>
              <div className="feature-highlight-info">
                <h4>Natural Ingredients</h4>
                <p>Handpicked &amp; Safe</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Flask size={22} weight="duotone" />
              </div>
              <div className="feature-highlight-info">
                <h4>Clinically Trusted</h4>
                <p>Backed by Science</p>
              </div>
            </div>

            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <ShieldCheck size={22} weight="duotone" />
              </div>
              <div className="feature-highlight-info">
                <h4>Safe for All Skin Types</h4>
                <p>Gentle &amp; Effective</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 3. Products Portfolio Grid */}
      <ScrollReveal animation="fade-up" delay={100}>
        <Section className="catalog-highlights-section">
          <Container>
            <div className="portfolio-section-header">
              <div className="portfolio-eyebrow-badge">
                <Plant size={15} weight="duotone" className="portfolio-eyebrow-icon" />
                <span>OUR PORTFOLIO</span>
                <Plant size={15} weight="duotone" className="portfolio-eyebrow-icon" />
              </div>
              <h2 className="portfolio-title">Premium Ayurvedic Products</h2>
              <div className="portfolio-flourish" aria-hidden="true">
                <span className="portfolio-flourish-line" />
                <Leaf size={14} className="portfolio-flourish-leaf" />
                <span className="portfolio-flourish-line" />
              </div>
            </div>

            <div className="home-portfolio-grid-wrapper">
              <Grid cols={3} gap="lg" className="products-catalogue-grid-container">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={handleProductClick}
                  />
                ))}
              </Grid>
            </div>

            <div className="catalog-view-all-container">
              <Button
                variant="outline"
                className="btn-view-all-products"
                onClick={() => handleTabChange('products')}
              >
                View All Products &rarr;
              </Button>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* 4. About S.S. PHARMACY Section */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Section className="home-about-section">
          <Container>
            <div className="home-about-grid">
              <div className="home-about-image-col">
                <div className="about-image-frame">
                  <img
                    src={`${import.meta.env.BASE_URL}products/Moon-light/Moon cream Hero_section.webp`}
                    alt="Authentic Ayurvedic herbal formulation"
                    className="about-editorial-image"
                    width={600}
                    height={440}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="home-about-content-col">
                <div className="home-section-eyebrow">
                  <span className="eyebrow-line" aria-hidden="true" />
                  <span className="eyebrow-text">ABOUT S.S. PHARMACY</span>
                </div>
                <h2 className="home-section-title">Rooted in Tradition, Committed to Quality</h2>
                <p className="home-about-text">
                  Established with a vision to make authentic Ayurvedic healing reliable and accessible, S.S. PHARMACY manufactures proprietary herbal healthcare remedies designed around everyday wellness needs.
                </p>
                <p className="home-about-text">
                  Operating out of Yerraguntla, Andhra Pradesh under official license code <strong>R-1970/Ayur</strong>, our team enforces strict quality standards from botanical raw herb inspection to final packaging.
                </p>

                <div className="about-license-badge">
                  <div className="badge-icon-wrap">
                    <ShieldCheck size={24} weight="duotone" />
                  </div>
                  <div className="badge-text-wrap">
                    <span className="badge-title">Government Licensed Facility</span>
                    <span className="badge-sub">License No. R-1970/Ayur | YSR Kadapa Dist., A.P.</span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* 5. Manufacturing Excellence Section (Editorial Two-Column Layout) */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Section className="home-manufacturing-section">
          <Container>
            <div className="mfg-intro-header">
              <div className="home-section-eyebrow justify-center">
                <span className="eyebrow-line" aria-hidden="true" />
                <span className="eyebrow-text">MANUFACTURING EXCELLENCE</span>
                <span className="eyebrow-line" aria-hidden="true" />
              </div>
              <h2 className="home-section-title text-center">Licensed Facilities &amp; Rigorous Quality Controls</h2>
              <p className="mfg-intro-description">
                Our plant maintains clean, controlled production floors and stainless-steel processing systems to ensure every batch meets Schedule T Ayurvedic standards.
              </p>
            </div>

            <div className="mfg-editorial-grid">
              <div className="mfg-image-panel">
                <img
                  src={`${import.meta.env.BASE_URL}products/chemist_lab.webp`}
                  alt="Controlled Ayurvedic pharmaceutical processing facility at S.S. Pharmacy"
                  className="mfg-facility-photo"
                  width={800}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
                <div className="mfg-credential-badge">
                  <ShieldCheck size={18} weight="duotone" className="badge-shield-icon" aria-hidden="true" />
                  <span className="badge-credential-text">GMP Compliant | Schedule T</span>
                </div>
              </div>

              <div className="mfg-points-panel">
                <div className="mfg-point-item">
                  <div className="mfg-point-header">
                    <div className="mfg-point-icon-box">
                      <Plant size={22} weight="duotone" aria-hidden="true" />
                    </div>
                    <div className="mfg-point-title-group">
                      <span className="mfg-point-number">01</span>
                      <h3>Authentic Sourcing</h3>
                    </div>
                  </div>
                  <p>Herbs sourced from local growers and checked for active phytochemical potency and pesticide compliance.</p>
                </div>

                <div className="mfg-point-divider" aria-hidden="true" />

                <div className="mfg-point-item">
                  <div className="mfg-point-header">
                    <div className="mfg-point-icon-box">
                      <Factory size={22} weight="duotone" aria-hidden="true" />
                    </div>
                    <div className="mfg-point-title-group">
                      <span className="mfg-point-number">02</span>
                      <h3>Hygienic Facility</h3>
                    </div>
                  </div>
                  <p>Licensed under R-1970/Ayur with controlled batch-processing and manufacturing environments.</p>
                </div>

                <div className="mfg-point-divider" aria-hidden="true" />

                <div className="mfg-point-item">
                  <div className="mfg-point-header">
                    <div className="mfg-point-icon-box">
                      <ShieldCheck size={22} weight="duotone" aria-hidden="true" />
                    </div>
                    <div className="mfg-point-title-group">
                      <span className="mfg-point-number">03</span>
                      <h3>Standardized Quality</h3>
                    </div>
                  </div>
                  <p>Formulation batches undergo quality checks for identity, purity and safety compliance.</p>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* 6. Controlled Dark-Green Quality Trust Band */}
      <section className="home-trust-band-section">
        <Container>
          <div className="trust-band-content">
            <div className="trust-band-column">
              <ShieldCheck size={30} weight="duotone" className="trust-band-icon" aria-hidden="true" />
              <div className="trust-band-text-group">
                <span className="trust-band-primary">GMP Certified</span>
                <span className="trust-band-secondary">Schedule T Facility</span>
              </div>
            </div>

            <div className="trust-band-divider" aria-hidden="true" />

            <div className="trust-band-column">
              <Certificate size={30} weight="duotone" className="trust-band-icon" aria-hidden="true" />
              <div className="trust-band-text-group">
                <span className="trust-band-primary">Govt. Licensed</span>
                <span className="trust-band-secondary">R-1970/Ayur</span>
              </div>
            </div>

            <div className="trust-band-divider" aria-hidden="true" />

            <div className="trust-band-column">
              <Plant size={30} weight="duotone" className="trust-band-icon" aria-hidden="true" />
              <div className="trust-band-text-group">
                <span className="trust-band-primary">Pure Botanical</span>
                <span className="trust-band-secondary">Herbal Ingredients</span>
              </div>
            </div>

            <div className="trust-band-divider" aria-hidden="true" />

            <div className="trust-band-column">
              <Flask size={30} weight="duotone" className="trust-band-icon" aria-hidden="true" />
              <div className="trust-band-text-group">
                <span className="trust-band-primary">Quality Tested</span>
                <span className="trust-band-secondary">Batch &amp; Purity Controls</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 7. Mission & Core Values Section (Editorial Two-Column Layout) */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Section className="home-mission-section">
          <Container>
            <div className="home-mission-grid">
              <div className="home-mission-main-col">
                <div className="home-section-eyebrow">
                  <span className="eyebrow-line" aria-hidden="true" />
                  <span className="eyebrow-text">OUR MISSION</span>
                </div>
                <h2 className="home-section-title">Bringing Authentic Ayurvedic Relief to Every Family</h2>

                <blockquote className="mission-quote-card">
                  <p className="mission-statement-lead">
                    "To formulate and manufacture trusted, high-potency Ayurvedic remedies that support body comfort and skin health through traditional wisdom."
                  </p>
                </blockquote>

                <p className="mission-description">
                  We bridge centuries of classical herbal knowledge with modern quality standards to provide reliable health solutions for wholesale distributors, clinics, and families.
                </p>
              </div>

              <div className="home-mission-panel-col">
                <div className="mission-commitment-panel">
                  <div className="commitment-panel-header">
                    <h3 className="commitment-title">OUR COMMITMENT</h3>
                    <p className="commitment-subtitle">Traditional formulation. Modern quality discipline.</p>
                  </div>

                  <div className="commitment-rows-group">
                    <div className="commitment-row-item">
                      <div className="commitment-icon-box">
                        <Plant size={22} weight="duotone" aria-hidden="true" />
                      </div>
                      <div className="commitment-info">
                        <h4>100% Herbal Authenticity</h4>
                        <p>Standardized botanical extracts prepared according to traditional formulation guidelines.</p>
                      </div>
                    </div>

                    <div className="commitment-divider" aria-hidden="true" />

                    <div className="commitment-row-item">
                      <div className="commitment-icon-box">
                        <ShieldCheck size={22} weight="duotone" aria-hidden="true" />
                      </div>
                      <div className="commitment-info">
                        <h4>Tested Safety &amp; Purity</h4>
                        <p>Formulated according to established safety and purity controls.</p>
                      </div>
                    </div>

                    <div className="commitment-divider" aria-hidden="true" />

                    <div className="commitment-row-item">
                      <div className="commitment-icon-box">
                        <Handshake size={22} weight="duotone" aria-hidden="true" />
                      </div>
                      <div className="commitment-info">
                        <h4>Reliable Channel Support</h4>
                        <p>Dedicated wholesale distributor partnerships and verified documentation support across India.</p>
                      </div>
                    </div>
                  </div>

                  <div className="commitment-panel-footer">
                    <Certificate size={16} weight="duotone" className="footer-cert-icon" aria-hidden="true" />
                    <span>Licensed Ayurvedic Manufacturer &mdash; <strong>R-1970/Ayur</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* 8. Home Page Ayurveda Showcase Banner (Placed below Our Mission & above Footer) */}
      <ScrollReveal animation="fade-up" delay={200}>
        <Section className="home-large-showcase-section">
          <Container>
            <div className="home-showcase-banner">
              <picture className="showcase-picture">
                <source media="(max-width: 767px)" srcSet={`${import.meta.env.BASE_URL}products/Hero section/madebynature-mobile.webp`} />
                <img
                  src={`${import.meta.env.BASE_URL}products/Hero section/madebynature.webp`}
                  alt="S.S. PHARMACY Herbal Showcase"
                  className="showcase-bg-image"
                  width={1600}
                  height={700}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div className="showcase-overlay" aria-hidden="true" />
              <div className="showcase-content">
                <h3 className="showcase-heading">
                  Made by Nature.<br />
                  Backed by Ayurveda.
                </h3>
                <p className="showcase-description">
                  Pure ingredients. Traditional wisdom. Licensed Ayurvedic healthcare remedies for your family.
                </p>
                <Button
                  variant="primary"
                  className="btn-showcase-cta"
                  onClick={() => handleTabChange('products')}
                >
                  Explore Products &rarr;
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </ScrollReveal>
    </div>
  );
}

