import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — resets scroll position to (0, 0) on every route change.
 * Placed inside the Router tree so `useLocation` works correctly.
 * This fixes the audit issue where navigating via footer links
 * preserved the previous scroll position on the new page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
