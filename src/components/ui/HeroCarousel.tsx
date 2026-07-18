import { useState, useEffect, useCallback } from 'react';

const heroSlides = [
  {
    src: '/products/Hero section/hero-section1.webp',
    alt: 'S.S. Pharmacy – Authentic Ayurvedic Product Range',
  },
  {
    src: '/products/Hero section/hero-section-moon.webp',
    alt: 'Moon Light Cream – Premium Ayurvedic Night Cream',
  },
  {
    src: '/products/Hero section/hero-section-pain-pills.webp',
    alt: 'Dr. Lion Pain Tablets – Natural Pain Relief',
  },
  {
    src: '/products/Hero section/pain-cream-hero-section.webp',
    alt: 'Dr. Lion Pain Cream – Ayurvedic Pain Relief',
  },
];

const AUTOPLAY_MS = 5000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [isTransitioning]
  );

  const next = useCallback(() => {
    goTo((current + 1) % heroSlides.length);
  }, [current, goTo]);

  // Autoplay
  useEffect(() => {
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="hero-carousel" aria-label="Hero image carousel">
      <div className="hero-carousel-track">
        {heroSlides.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-carousel-slide ${i === current ? 'active' : ''}`}
            aria-hidden={i !== current}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width={1920}
              height={600}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding={i === 0 ? "sync" : "async"}
              className="hero-carousel-image"
            />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="hero-slider-dots" role="tablist" aria-label="Slide navigation">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className={`hero-slider-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
