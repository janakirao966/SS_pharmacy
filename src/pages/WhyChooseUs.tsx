import { ShieldCheck, Award, Sparkles, HeartHandshake, Leaf, Factory, CheckCircle2 } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function WhyChooseUs() {
  const valueProps = [
    {
      icon: <Leaf aria-hidden="true" />,
      title: "Authentic Herbs & Sourcing",
      description: "We source our herbs directly from sustainable local growers, ensuring the active phytochemical components are intact and free from pesticides."
    },
    {
      icon: <Factory aria-hidden="true" />,
      title: "Licensed GMP Facility",
      description: "Our state-of-the-art manufacturing plant follows strict Good Manufacturing Practices (GMP) and is licensed by the government (Lic. R-1970/Ayur)."
    },
    {
      icon: <ShieldCheck aria-hidden="true" />,
      title: "Rigorous Quality Assurances",
      description: "Every batch of our Ayurvedic proprietary medicines undergoes standard laboratory checks to guarantee safety, potency, and heavy-metal compliance."
    },
    {
      icon: <Sparkles aria-hidden="true" />,
      title: "Standardized Formulations",
      description: "Our extraction methodologies ensure each batch yields a reliable, high-potency formula with exact concentrations of active ingredients."
    },
    {
      icon: <HeartHandshake aria-hidden="true" />,
      title: "Reliable Channel Partnerships",
      description: "We provide wholesale distributors, clinics, and pharmacies with prompt shipping, certified document compliance, and dedicated support."
    },
    {
      icon: <Award aria-hidden="true" />,
      title: "One Step Solution Tagline",
      description: "We aim to provide comprehensive formulations that address the root causes of musculoskeletal and skin conditions, delivering wellness in every drop."
    }
  ];

  return (
    <div className="wcu-page">
      <SEO
        title="Why Choose S.S. PHARMACY - Authentic Ayurvedic Quality"
        description="Learn why distributors, practitioners, and consumers trust S.S. PHARMACY for certified Ayurvedic proprietary medicines and manufacturing standards."
        canonical="https://sspharmacy.com/why-choose-us"
      />

      {/* 1. Header Block */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Why Choose Us' }]} className="mb-6" />
          
          <SectionHeader
            eyebrow="Our Value Proposition"
            title="The Pillar of Authentic Ayurveda"
            subtitle="Discover S.S. PHARMACY's uncompromising standards in sourcing, manufacturing, and client relationships that make us the preferred partner for Ayurvedic wellness."
            align="left"
            isPageHeader
          />
        </Container>
      </Section>

      {/* 2. Key Pillars Grid */}
      <Section className="pb-16 pt-4">
        <Container>
          <div className="wcu-pillars-grid">
            {valueProps.map((prop, idx) => (
              <CleanCard key={idx} variant="default" interactive className="h-full">
                <div className="wcu-pillar-content">
                  <div className="wcu-icon-badge">
                    {prop.icon}
                  </div>
                  <h3 className="wcu-pillar-title">{prop.title}</h3>
                  <p className="wcu-pillar-desc">{prop.description}</p>
                </div>
              </CleanCard>
            ))}
          </div>
        </Container>
      </Section>

      {/* 3. Detailed Standards Spotlight */}
      <section className="wcu-spotlight-section">
        <Container>
          <div className="wcu-spotlight-grid">
            <div className="wcu-spotlight-text">
              <span className="eyebrow-badge">Manufacturing Cleanliness</span>
              <h2 className="wcu-spotlight-heading">
                Pure Processing from Herb to Bottle
              </h2>
              <p className="wcu-spotlight-body">
                Our plant is located in Prakash Nagar, Yerraguntla, Kadapa District, Andhra Pradesh. We maintain clean, moisture-controlled production floors, stainless steel processing tanks, and automated bottling lines to ensure there is zero contamination.
              </p>
              
              <ul className="wcu-checklist">
                <li className="wcu-checklist-item">
                  <span className="wcu-checklist-icon">
                    <CheckCircle2 aria-hidden="true" />
                  </span>
                  <span className="wcu-checklist-label">Standardized extraction temperatures to preserve active botanicals.</span>
                </li>
                <li className="wcu-checklist-item">
                  <span className="wcu-checklist-icon">
                    <CheckCircle2 aria-hidden="true" />
                  </span>
                  <span className="wcu-checklist-label">Batch-coded logs for full traceability from raw herbs to final package.</span>
                </li>
                <li className="wcu-checklist-item">
                  <span className="wcu-checklist-icon">
                    <CheckCircle2 aria-hidden="true" />
                  </span>
                  <span className="wcu-checklist-label">Strict zero-chemical, paraben-free, and steroid-free formulations.</span>
                </li>
              </ul>
            </div>

            <div className="wcu-spotlight-image-frame">
              <img
                src={`${import.meta.env.BASE_URL}products/why_choose_us_image.webp`}
                alt="S.S. Pharmacy quality standard showcase"
                className="wcu-spotlight-image"
                width={600}
                height={320}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
