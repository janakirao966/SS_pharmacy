import { useState } from 'react';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      q: "Where are S.S. PHARMACY products manufactured?",
      a: "All S.S. PHARMACY formulations are prepared and packaged in our government-licensed Ayurvedic manufacturing facility located in Yerraguntla, Kadapa District, Andhra Pradesh (Mfg. License No. R-1970/Ayur)."
    },
    {
      q: "Are the formulations approved by the government?",
      a: "Yes. S.S. PHARMACY operates under a valid Ayurvedic manufacturing license granted by the Licensing Authority of the Government of Andhra Pradesh (AYUSH Department)."
    },
    {
      q: "Can I sell these products in my clinic or pharmacy?",
      a: "Absolutely. We supply proprietary Ayurvedic formulations to wholesale dealers, retail pharmacies, clinics, hospitals, and Ayurvedic practitioners. Check out our Distributor tab for more details."
    },
    {
      q: "Do you use mineral oil or parabens?",
      a: "No. Our formulations focus on natural herbal extracts, cold-pressed oils, and essential herbal decoctions. We do not use steroids, parabens, or synthetic toxic preservatives."
    },
    {
      q: "Is shipping available across India?",
      a: "Yes. We ship commercial orders and distributor shipments across all major states in India through our integrated logistics network."
    }
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="faq-page">
      <SEO
        title="Frequently Asked Questions - S.S. PHARMACY"
        description="Find answers about S.S. PHARMACY licensing, Ayurvedic drug approval, delivery regions, and partner registration."
        canonical="https://sspharmacy.com/faq"
        schema={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.a
            }
          }))
        }}
      />
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'FAQ' }]} className="mb-6" />
          <div className="faq-header-block">
            <SectionHeader
              eyebrow="Help Desk"
              title="Frequently Asked Questions"
              subtitle="Find answers to questions regarding S.S. PHARMACY licensing, product usage guidelines, and distributor programs."
              align="left"
              isPageHeader
            />

            {/* Search Box */}
            <div className="search-bar-container mt-8 max-w-[500px]">
              <Search size={18} className="search-icon-inside" style={{ marginRight: '8px', color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search FAQs"
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* 2. FAQ Accordion Grid */}
      <Section className="pt-6 md:pt-8 pb-12 md:pb-16 lg:pb-24">
        <Container>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No questions match your search criteria.</p>
            </div>
          ) : (
            <div className="faq-accordion-container max-w-[800px] mx-auto">
              <Grid cols={1} gap="sm">
                {filteredFaqs.map((faq, index) => (
                  <CleanCard key={index} variant="default" className="faq-item-outer">
                    <div className="faq-item-card p-0">
                      <button
                        type="button"
                        className="faq-question-row w-full flex items-center justify-between p-6 bg-transparent border-0 text-left cursor-pointer"
                        onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                      >
                        <div className="faq-question-text flex items-center space-x-3">
                          <HelpCircle size={18} className="text-gold flex-shrink-0" />
                          <h4 className="font-display text-md text-brand-primary m-0">{faq.q}</h4>
                        </div>
                        <ChevronDown 
                          className={`chevron-icon transition-transform duration-300 ${activeIndex === index ? 'rotate-180' : ''}`} 
                          size={18} 
                        />
                      </button>
                      <div className={`faq-answer-panel ${activeIndex === index ? 'expanded' : ''}`}>
                        <div className="faq-answer-inner">
                          <div className="faq-answer-text px-6 pb-6 pt-2 border-t border-hairline">
                            <p className="text-secondary text-sm leading-relaxed m-0">{faq.a}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CleanCard>
                ))}
              </Grid>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
