import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation type */
  animation?: 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale';
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Duration of the animation (ms) */
  duration?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** Additional className */
  className?: string;
  /** Only animate once */
  once?: boolean;
}

export default function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = '',
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, once]);

  const getInitialStyles = (): CSSProperties => {
    const base: CSSProperties = {
      opacity: 0,
      transition: `opacity ${duration}ms var(--ease-out) ${delay}ms, transform ${duration}ms var(--ease-out) ${delay}ms`,
      willChange: 'opacity, transform',
    };

    switch (animation) {
      case 'fade-up':
        return { ...base, transform: 'translateY(24px)' };
      case 'fade-left':
        return { ...base, transform: 'translateX(-24px)' };
      case 'fade-right':
        return { ...base, transform: 'translateX(24px)' };
      case 'scale':
        return { ...base, transform: 'scale(0.95)' };
      case 'fade-in':
      default:
        return base;
    }
  };

  const getVisibleStyles = (): CSSProperties => ({
    opacity: 1,
    transform: 'translateY(0) translateX(0) scale(1)',
    transition: `opacity ${duration}ms var(--ease-out) ${delay}ms, transform ${duration}ms var(--ease-out) ${delay}ms`,
    willChange: 'auto',
  });

  return (
    <div
      ref={ref}
      className={className}
      style={isVisible ? getVisibleStyles() : getInitialStyles()}
    >
      {children}
    </div>
  );
}
