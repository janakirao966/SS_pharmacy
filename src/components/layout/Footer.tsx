import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Star, Leaf } from 'lucide-react';
import Container from './Container';
import Grid from './Grid';

interface FooterProps {
  setActiveTab?: (tab: string) => void;
}

export default function Footer({ setActiveTab: _setActiveTab }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = [
    {
      text: "Dr. Lion Pain Cream really helped me with my knee pain. Very effective and completely herbal. Highly recommended!",
      author: "Ramesh B."
    },
    {
      text: "Moon Light Cream has worked wonders for my dark spots. My skin feels fresh, clear, and glowing naturally.",
      author: "Sneha L."
    },
    {
      text: "We have been distributing Dr. Lion products for over a year. Outstanding feedback and absolute quality consistency.",
      author: "Venkatesh Pharmacy"
    }
  ];

  // Auto-scroll testimonials every 6 seconds, pausing on hover/focus and resetting on slide change
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, activeTestimonial, testimonials.length]);

  const handleNext = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="main-footer">
      <Container>
        <Grid cols={4} gap="lg" className="footer-main-grid">
          {/* Column 1: About AYU S.S. Pharmacy */}
          <div className="footer-links-group">
            <h3>About AYU S.S. Pharmacy</h3>
            <p className="text-sm leading-relaxed mb-6">
              We are a trusted Ayurvedic company dedicated to providing safe, effective and natural healthcare solutions. S.S. PHARMACY manufactures premium government-licensed Ayurvedic formulations.
            </p>
            <Link
              to="/about"
              className="btn-pill border-light text-light text-xs py-2 px-5 hover:bg-white hover:text-[#2D5016]"
              onClick={handleScrollTop}
              style={{ display: 'inline-flex', backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff', borderWidth: '1px', borderStyle: 'solid' }}
            >
              Know More
            </Link>
          </div>

          {/* Column 2: Manufacturing Excellence */}
          <div className="footer-links-group">
            <h3>Manufacturing Excellence</h3>
            <ul className="footer-bullets-list">
              <li className="footer-bullet-item">
                <Check size={14} className="footer-bullet-check" />
                <span>GMP Certified Manufacturing</span>
              </li>
              <li className="footer-bullet-item">
                <Check size={14} className="footer-bullet-check" />
                <span>Quality Control at Every Step</span>
              </li>
              <li className="footer-bullet-item">
                <Check size={14} className="footer-bullet-check" />
                <span>Pure & Natural Ingredients</span>
              </li>
              <li className="footer-bullet-item">
                <Check size={14} className="footer-bullet-check" />
                <span>Safe & Hygienic Packaging</span>
              </li>
            </ul>
            <img
              src={`${import.meta.env.BASE_URL}products/chemist_lab.webp`}
              alt="Ayurvedic Chemist Facility"
              className="footer-chemist-img"
              width={800}
              height={800}
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Column 3: Our Mission */}
          <div className="footer-links-group">
            <h3>Our Mission</h3>
            <p className="text-sm leading-relaxed mb-6">
              To promote health and wellness through authentic Ayurvedic solutions that are effective, affordable and trusted by all.
            </p>
            <div className="flex mt-6 opacity-30 justify-start">
              <Leaf className="text-white" size={48} />
            </div>
          </div>

          {/* Column 4: What Our Customers Say (Testimonials) */}
          <div className="footer-links-group">
            <h3>What Our Customers Say</h3>
            
            <div
              className="footer-testimonial-slider"
              role="region"
              aria-label="Customer testimonials"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              aria-live="polite"
            >
              <div className="footer-testimonials-slider-track">
              {testimonials.map((test, index) => (
                <figure
                  key={index}
                  className={`footer-testimonial-slide ${activeTestimonial === index ? 'active' : ''}`}
                >
                  <div className="footer-stars-row" aria-hidden="true">
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                  </div>
                  <blockquote className="footer-testimonial-quote">
                    "{test.text}"
                  </blockquote>
                  <figcaption className="footer-testimonial-author">
                    — {test.author}
                  </figcaption>
                </figure>
              ))}
              </div>
            </div>

            {/* Slider Controls */}
            <div className="footer-slider-controls">
              <button
                type="button"
                className="footer-slider-arrow"
                onClick={handlePrev}
                aria-label="Previous testimonial"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              >
                <ChevronLeft size={16} />
              </button>
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`footer-slider-dot ${activeTestimonial === idx ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(idx)}
                  aria-label={`Go to slide ${idx + 1} of ${testimonials.length}`}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
              ))}
              <button
                type="button"
                className="footer-slider-arrow"
                onClick={handleNext}
                aria-label="Next testimonial"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Grid>

        {/* Footer Bottom Block */}
        <div className="footer-bottom">
          <p className="text-xs">
            &copy; {currentYear} S.S. PHARMACY. All rights reserved. | Mfg. Lic. No. R-1970/Ayur
          </p>
          <div className="footer-bottom-links">
            <Link to="/track-order" onClick={handleScrollTop}>Track Order</Link>
            <Link to="/terms" onClick={handleScrollTop}>Terms &amp; Conditions</Link>
            <Link to="/privacy" onClick={handleScrollTop}>Privacy Policy</Link>
            <Link to="/accessibility" onClick={handleScrollTop}>Accessibility Statement</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
