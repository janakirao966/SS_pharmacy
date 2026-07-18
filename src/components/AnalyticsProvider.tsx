import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * AnalyticsProvider
 * A lightweight stub for web analytics (e.g., Vercel Web Analytics, Plausible, or Google Analytics).
 * Tracks page views based on route changes.
 */
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && import.meta.env.MODE === 'production') {
      // In a real implementation, you would trigger your tracking script here.
      // Example: window.plausible('pageview', { u: location.pathname });
      console.log(`[Analytics Stub] Page view tracked: ${location.pathname}`);
    }
  }, [location.pathname]);

  return <>{children}</>;
}
