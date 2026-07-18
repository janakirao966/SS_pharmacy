import { useState, useEffect } from 'react';

// Reading this as: LocalStorage-backed custom React hook to manage product favorites/wishlist state.
// DESIGN_VARIANCE: 6
// MOTION_INTENSITY: 5
// VISUAL_DENSITY: 3

export default function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Load initial wishlist state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ss_pharmacy_wishlist');
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch {
      console.error('Failed to load wishlist from localStorage.');
    }
  }, []);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      
      try {
        localStorage.setItem('ss_pharmacy_wishlist', JSON.stringify(updated));
      } catch {
        console.error('Failed to save wishlist to localStorage.');
      }
      
      return updated;
    });
  };

  const isFavorited = (productId: string) => wishlist.includes(productId);

  return {
    wishlist,
    toggleWishlist,
    isFavorited
  };
}
