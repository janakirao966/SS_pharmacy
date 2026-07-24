import { useState, useEffect, useCallback, useRef } from 'react';
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react';

interface SlideData {
  id: string;
  desktopImage: string;
  mobileImage: string;
  desktopPosition?: string;
  mobilePosition?: string;
  alt: string;
  eyebrow: string;
  title: string;
  titleLine2?: string;
  subtitle: string;
  description: string;
  productId: string;
}

interface HeroCarouselProps {
  setActiveTab?: (tab: string) => void;
  setSelectedProductId?: (id: string) => void;
}

const baseUrl = import.meta.env.BASE_URL;

const heroSlides: SlideData[] = [
  {
    id: 'moon-cream',
    desktopImage: baseUrl + 'products/Hero%20section/hero-moon-desktop.webp',
    mobileImage: baseUrl + 'products/Hero%20section/hero-moon-mobile.webp',
    desktopPosition: 'center right',
    mobilePosition: 'bottom center',
    alt: 'Moon Light Cream – Pure Ayurvedic Skin Care',
    eyebrow: 'TRADITIONAL HEALING • MODERN WELLNESS',
    title: 'Moon Light',
    titleLine2: 'Cream',
    subtitle: 'Natural Care for Radiant Skin',
    description: 'Pure Ayurvedic herbal skincare remedy formulated with Manjishta, Chandana, and Kumkuma for pimples, dark spots, tan removal, and natural glow.',
    productId: 'moon-light-cream'
  },
  {
    id: 'pain-cream',
    desktopImage: baseUrl + 'products/Hero%20section/hero-pain-cream-desktop.webp',
    mobileImage: baseUrl + 'products/Hero%20section/hero-pain-cream-mobile.webp',
    desktopPosition: 'center right',
    mobilePosition: 'bottom center',
    alt: 'Dr. Lion Pain Relief Cream – S.S. Pharmacy',
    eyebrow: 'TRADITIONAL HEALING • MODERN WELLNESS',
    title: 'Dr. Lion',
    titleLine2: 'Pain Cream',
    subtitle: 'Soothing Relief for Every Move',
    description: 'An Ayurvedic pain relief cream formulated with powerful natural ingredients that help relieve joint pain, muscle pain, back pain, headache and body discomfort.',
    productId: 'dr-lion-pain-cream'
  },
  {
    id: 'brand-main',
    desktopImage: baseUrl + 'products/Hero%20section/hero-main-desktop.webp',
    mobileImage: baseUrl + 'products/Hero%20section/hero-main-mobile.webp',
    desktopPosition: 'center right',
    mobilePosition: 'bottom center',
    alt: 'Ayurvedic Solutions for Modern Wellness – S.S. Pharmacy',
    eyebrow: 'TRADITIONAL HEALING • MODERN WELLNESS',
    title: 'Ayurvedic Solutions for',
    titleLine2: 'Modern Wellness',
    description: 'S.S. Pharmacy manufactures licensed, quality-focused Ayurvedic medicines and herbal healthcare formulations designed to support musculoskeletal comfort and healthy-looking skin.',
    subtitle: 'Pure Ayurveda, Pure Life',
    productId: 'all'
  },
  {
    id: 'pain-pills',
    desktopImage: baseUrl + 'products/Hero%20section/hero-pain-pills-desktop.webp',
    mobileImage: baseUrl + 'products/Hero%20section/hero-pain-pills-mobile.webp',
    desktopPosition: 'center right',
    mobilePosition: 'bottom center',
    alt: 'Dr. Lion Pain Pills – Traditional Herbal Remedy',
    eyebrow: 'TRADITIONAL HEALING • MODERN WELLNESS',
    title: 'Dr. Lion',
    titleLine2: 'Pain Pills',
    subtitle: 'Relief from Within, Strength for Life',
    description: 'Traditional Ayurvedic proprietary medicine formulated with purified herbal extracts for deep joint mobility, muscular comfort, and natural strength.',
    productId: 'dr-lion-pain-pills'
  }
];

const AUTOPLAY_MS = 6000;

export default function HeroCarousel({ setActiveTab, setSelectedProductId }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isTransitioningRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goTo = useCallback((index: number) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setCurrent(index);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 600);
  }, []);

  const next = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setCurrent((prev) => (prev + 1) % heroSlides.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 600);
  }, []);

  const prev = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setCurrent((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 600);
  }, []);

  // Autoplay handler with prefers-reduced-motion check
  useEffect(() => {
    if (isPaused) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const timer = setInterval(() => {
      next();
    }, AUTOPLAY_MS);

    return () => clearInterval(timer);
  }, [isPaused, next]);

  // Touch Swipe Handlers for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      next();
    } else if (e.key === 'ArrowLeft') {
      prev();
    }
  };

  const handleCtaClick = (tab: string, productId?: string) => {
    if (productId && productId !== 'all' && setSelectedProductId) {
      setSelectedProductId(productId);
    }
    if (setActiveTab) {
      setActiveTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section 
      className="hero-slider-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Homepage Featured Products Carousel"
    >
      <div className="hero-slides-wrapper">
        {heroSlides.map((slide, i) => {
          const isActive = i === current;
          return (
            <div
              key={slide.id}
              className={`hero-carousel-slide ${isActive ? 'active' : ''}`}
              aria-hidden={!isActive}
            >
              {/* Responsive WebP Image switching */}
              <picture className="hero-picture">
                <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
                <img
                  src={slide.desktopImage}
                  alt={slide.alt}
                  width={1920}
                  height={960}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding={i === 0 ? "sync" : "async"}
                  className="hero-carousel-image"
                  style={{
                    '--slide-desktop-pos': slide.desktopPosition || 'center right',
                    '--slide-mobile-pos': slide.mobilePosition || 'bottom center'
                  } as React.CSSProperties}
                />
              </picture>

              {/* Scrim Gradient for Contrast */}
              <div className="hero-scrim-overlay" aria-hidden="true" />

              {/* Dynamic HTML Content Overlay */}
              <div className="hero-content-wrapper">
                <div className={`hero-text-overlay ${isActive ? 'text-animated' : ''}`}>
                  {/* Eyebrow */}
                  <div className="hero-eyebrow-wrapper">
                    <span className="hero-eyebrow-line" aria-hidden="true" />
                    <span className="hero-eyebrow-text">{slide.eyebrow}</span>
                    <span className="hero-eyebrow-line" aria-hidden="true" />
                  </div>

                  {/* Main Title */}
                  <h1 className="hero-title">
                    {slide.title}
                    {slide.titleLine2 && (
                      <>
                        <br />
                        <span className="hero-title-line2">{slide.titleLine2}</span>
                      </>
                    )}
                  </h1>

                  {/* Subtitle (Playfair Display Italic) */}
                  <h2 className="hero-subtitle">{slide.subtitle}</h2>

                  {/* Description */}
                  <p className="hero-description">{slide.description}</p>

                  {/* Dual CTA Action Buttons */}
                  <div className="hero-cta-group">
                    <button
                      type="button"
                      className="btn-hero-primary"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleCtaClick('products', slide.productId)}
                    >
                      <span>Explore Products</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-hero-secondary"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleCtaClick('about')}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Next / Prev Arrow Navigation */}
      <button
        type="button"
        className="hero-arrow-btn hero-arrow-prev"
        onClick={prev}
        aria-label="Previous Slide"
      >
        <CaretLeft size={22} weight="bold" />
      </button>

      <button
        type="button"
        className="hero-arrow-btn hero-arrow-next"
        onClick={next}
        aria-label="Next Slide"
      >
        <CaretRight size={22} weight="bold" />
      </button>

      {/* Navigation Dot Indicators */}
      <div className="hero-slider-dots" role="tablist" aria-label="Slide navigation">
        {heroSlides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            className={`hero-slider-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
          />
        ))}
      </div>
    </section>
  );
}
