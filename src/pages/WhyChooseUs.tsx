import { ShieldCheck, Award, Sparkles, HeartHandshake, Leaf, Factory, CheckCircle2 } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function WhyChooseUs() {
  const valueProps = [
    {
      icon: <Leaf size={32} className="text-[#3D6B20]" />,
      title: "Authentic Herbs & Sourcing",
      description: "We source our herbs directly from sustainable local growers, ensuring the active phytochemical components are intact and free from pesticides."
    },
    {
      icon: <Factory size={32} className="text-[#3D6B20]" />,
      title: "Licensed GMP Facility",
      description: "Our state-of-the-art manufacturing plant follows strict Good Manufacturing Practices (GMP) and is licensed by the government (Lic. R-1970/Ayur)."
    },
    {
      icon: <ShieldCheck size={32} className="text-[#3D6B20]" />,
      title: "Rigorous Quality Assurances",
      description: "Every batch of our Ayurvedic proprietary medicines undergoes standard laboratory checks to guarantee safety, potency, and heavy-metal compliance."
    },
    {
      icon: <Sparkles size={32} className="text-[#3D6B20]" />,
      title: "Standardized Formulations",
      description: "Our extraction methodologies ensure each batch yields a reliable, high-potency formula with exact concentrations of active ingredients."
    },
    {
      icon: <HeartHandshake size={32} className="text-[#3D6B20]" />,
      title: "Reliable Channel Partnerships",
      description: "We provide wholesale distributors, clinics, and pharmacies with prompt shipping, certified document compliance, and dedicated support."
    },
    {
      icon: <Award size={32} className="text-[#3D6B20]" />,
      title: "One Step Solution Tagline",
      description: "We aim to provide comprehensive formulations that address the root causes of musculoskeletal and skin conditions, delivering wellness in every drop."
    }
  ];

  return (
    <div className="why-choose-us-page">
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
          <Grid cols={3} gap="lg" className="mt-8">
            {valueProps.map((prop, idx) => (
              <CleanCard key={idx} variant="default" interactive className="h-full">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="w-fit p-3 bg-[#3D6B20]/5 rounded-full mb-6 flex items-center justify-center">
                      {prop.icon}
                    </div>
                    <h3 className="text-xl font-bold text-[#3D6B20] font-display mb-3">{prop.title}</h3>
                    <p className="text-secondary text-sm leading-relaxed">{prop.description}</p>
                  </div>
                </div>
              </CleanCard>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* 3. Detailed Standards Spotlight */}
      <Section className="py-16 bg-[#F8F7F4] border-t border-b border-light">
        <Container>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <span className="eyebrow-badge">Manufacturing Cleanliness</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#3D6B20] font-display mt-2 mb-6">
                Pure Processing from Herb to Bottle
              </h2>
              <p className="text-secondary mb-6 leading-relaxed">
                Our plant is located in Prakash Nagar, Yerraguntla, Kadapa District, Andhra Pradesh. We maintain clean, moisture-controlled production floors, stainless steel processing tanks, and automated bottling lines to ensure there is zero contamination.
              </p>
              
              <ul className="flex flex-col gap-3 list-none p-0">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C4A35A] mt-1 shrink-0" />
                  <span className="text-sm text-secondary font-medium">Standardized extraction temperatures to preserve active botanicals.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C4A35A] mt-1 shrink-0" />
                  <span className="text-sm text-secondary font-medium">Batch-coded logs for full traceability from raw herbs to final package.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C4A35A] mt-1 shrink-0" />
                  <span className="text-sm text-secondary font-medium">Strict zero-chemical, paraben-free, and steroid-free formulations.</span>
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <CleanCard variant="elevated" className="overflow-hidden p-2">
                <img
                  src="/products/Dr lion pain cream/Pain cream transparent image.webp"
                  alt="Ayu S.S. Pharmacy Quality Standard Showcase"
                  className="w-full h-80 object-contain bg-white rounded-lg"
                  width={600}
                  height={320}
                  loading="lazy"
                  decoding="async"
                />
              </CleanCard>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
