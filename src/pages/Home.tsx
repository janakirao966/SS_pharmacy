import { ShieldCheck, Award, Zap, Leaf } from 'lucide-react';
import { products } from '../data/products';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Button from '../components/ui/Button';
import SectionHeader from '../components/ui/SectionHeader';
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
      <HeroCarousel />

      {/* 3. Feature Highlights Row (5 Columns) */}
      <section className="feature-highlights-section">
        <Container>
          <div className="feature-highlights-grid">
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Leaf size={18} />
              </div>
              <div className="feature-highlight-info">
                <h4>Natural Ingredients</h4>
                <p>Carefully selected herbs & natural extracts</p>
              </div>
            </div>
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Award size={18} />
              </div>
              <div className="feature-highlight-info">
                <h4>Ayurvedic Expertise</h4>
                <p>Traditional knowledge & research</p>
              </div>
            </div>
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="feature-highlight-info">
                <h4>GMP Certified</h4>
                <p>Manufactured in GMP compliant facility</p>
              </div>
            </div>
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="feature-highlight-info">
                <h4>No Harmful Chemicals</h4>
                <p>Free from steroids, parabens & toxins</p>
              </div>
            </div>
            <div className="feature-highlight-card">
              <div className="feature-highlight-icon">
                <Zap size={18} />
              </div>
              <div className="feature-highlight-info">
                <h4>Customer Satisfaction</h4>
                <p>Trusted by thousands of happy patients</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. Products Portfolio Grid */}
      <ScrollReveal animation="fade-up" delay={100}>
        <Section className="catalog-highlights-section">
          <Container>
            <SectionHeader
              eyebrow="OUR PORTFOLIO"
              title="Ayurvedic Solutions & Formulations"
              subtitle="Explore our government-licensed Ayurvedic proprietary remedies crafted under strict quality controls."
            />

            <div className="mt-12">
              <Grid cols={3} gap="lg">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={handleProductClick}
                    onEnquire={() => {
                      handleTabChange('contact');
                    }}
                  />
                ))}
              </Grid>
            </div>

            <div className="flex justify-center mt-12">
              <Button
                variant="secondary"
                onClick={() => handleTabChange('products')}
              >
                View All Products
              </Button>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* 5. Home Page Large Showcase Image */}
      <ScrollReveal animation="fade-up" delay={200}>
        <Section className="home-large-showcase-section pb-24 pt-4 border-t border-hairline">
          <Container>
            <div className="home-large-showcase-container">
              <img
                src="/products/Hero section/home_page_image.webp"
                alt="S.S. PHARMACY Herbal Showcase"
                className="home-large-showcase-image"
                width={1200}
                height={304}
                loading="lazy"
                decoding="async"
              />
            </div>
          </Container>
        </Section>
      </ScrollReveal>
    </div>
  );
}
