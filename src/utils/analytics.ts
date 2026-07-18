interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  [key: string]: any;
}

export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  const payload: AnalyticsEvent = {
    event: 'ss_analytics_event',
    category,
    action,
    label,
    value,
    timestamp: new Date().toISOString()
  };

  // Log to console for development audit visibility
  console.log(`%c[Analytics Event]: ${category} - ${action}`, 'color: #9B7B35; font-weight: bold;', payload);

  // Dispatch standard CustomEvent so third-party scripts can hook in
  const customEvent = new CustomEvent('ssAnalyticsEvent', { detail: payload });
  window.dispatchEvent(customEvent);
};

export const trackPageView = (path: string) => {
  trackEvent('PageNavigation', 'View', path);
};
