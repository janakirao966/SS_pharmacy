import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import SEO from '../components/ui/SEO';

export default function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      quote: "S.S. PHARMACY has been a trusted supplier for our medical shops. Their packaging and batch reliability are highly satisfactory.",
      author: "K. Raghunatha Reddy",
      role: "Distributor Partner",
      location: "Kadapa, AP",
      initials: "KR"
    },
    {
      quote: "The Dr. Lion Pain Cream has been well-received by our customers seeking support for everyday joint comfort. Feedback has been extremely positive regarding its cooling effects.",
      author: "Dr. A. Prasad",
      role: "Ayurvedic Clinic Lead",
      location: "Tirupati, AP",
      initials: "AP"
    },
    {
      quote: "Moon Light Cream stands out for its smooth texture and consistent herbal scent. Our retail customers choose it repeatedly for their skincare routines.",
      author: "S. Lakshmi",
      role: "Retail Pharmacy Partner",
      location: "Nellore, AP",
      initials: "SL"
    },
    {
      quote: "We appreciate the prompt B2B order delivery and transparent licensing documentation provided by the S.S. Pharmacy team.",
      author: "M. Subbaiah",
      role: "Wholesale Medicine Dealer",
      location: "Kurnool, AP",
      initials: "MS"
    }
  ];

  const handleNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="testimonials-page">
      <SEO
        title="Partner & Customer Feedback - S.S. PHARMACY"
        description="Read reviews from our Ayurvedic clinic leads, distribution partners, and retail outlets regarding formulation batch consistency."
        canonical="https://sspharmacy.com/testimonials"
        schema={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "S.S. PHARMACY Ayurvedic Medicines",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "24"
          },
          "review": testimonials.map((t) => ({
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": t.author
            },
            "reviewBody": t.quote,
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5"
            }
          }))
        }}
      />
      
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Testimonials' }]} className="mb-6" />
          <div className="testimonials-header-block text-left">
            <SectionHeader
              eyebrow="Social Proof"
              title="Partner & Customer Feedback"
              subtitle="Read comments from our retail outlets, distribution partners, and clinics regarding formulation consistency and packaging quality."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Interactive Testimonial Slider */}
      <Section className="pb-24 pt-4">
        <Container>
          <div className="relative max-w-[700px] mx-auto mt-8">
            <div className="testimonial-slide-viewport overflow-hidden">
              <CleanCard variant="default" className="transform transition-transform duration-300 hover:scale-[1.01]" innerClassName="testimonial-card-inner">
                  {/* Verified Badge & Rating Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <span className="verified-partner-badge">
                      <CheckCircle2 size={12} className="text-[#3D6B20]" />
                      Verified Partner
                    </span>
                    
                    <div className="rating-stars flex gap-0.5 text-gold">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" className="text-[#9B7B35]" />
                      ))}
                    </div>
                  </div>

                  {/* Quote content */}
                  <blockquote className="font-display italic text-lg md:text-xl leading-relaxed text-[#3D6B20] font-medium flex-1 mb-8">
                    &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                  </blockquote>

                  {/* Author Card Info */}
                  <div className="testimonial-author-row flex items-center gap-4 pt-6 border-t border-hairline w-full">
                    {/* Initials Avatar */}
                    <div className="testimonial-avatar">
                      {testimonials[activeTestimonial].initials}
                    </div>
                    
                    <div className="author-meta text-left">
                      <h6 className="font-bold text-[#1A1A1A] text-sm md:text-md leading-tight">
                        {testimonials[activeTestimonial].author}
                      </h6>
                      <p className="text-secondary text-xs mt-1">
                        {testimonials[activeTestimonial].role} &middot; <span className="text-[#9B7B35] font-semibold">{testimonials[activeTestimonial].location}</span>
                      </p>
                    </div>
                  </div>
              </CleanCard>
            </div>

            {/* Navigation buttons */}
            <button
              type="button"
              onClick={handlePrevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 md:-translate-x-16 p-3 rounded-full border border-[#EBE6DC] bg-white hover:bg-[#FAF8F5] text-brand-primary transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center z-10"
              aria-label="Previous Testimonial"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 md:translate-x-16 p-3 rounded-full border border-[#EBE6DC] bg-white hover:bg-[#FAF8F5] text-brand-primary transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center z-10"
              aria-label="Next Testimonial"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </Container>
      </Section>
    </div>
  );
}
