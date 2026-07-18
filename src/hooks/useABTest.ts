import { useState, useEffect } from 'react';
import { trackEvent } from '../utils/analytics';

export type ABVariant = 'A' | 'B';

/**
 * Custom React hook to assign users to a variant group ('A' or 'B') for A/B testing.
 * Automatically persists assignments in local storage and reports variant groups via analytics.
 */
export function useABTest(testName: string): ABVariant {
  const [variant, setVariant] = useState<ABVariant>('A');

  useEffect(() => {
    const storageKey = `ab_test_${testName}`;
    let assigned = localStorage.getItem(storageKey) as ABVariant;

    if (!assigned || (assigned !== 'A' && assigned !== 'B')) {
      assigned = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(storageKey, assigned);
      trackEvent('ABTest', 'Assign', `${testName}_${assigned}`);
    } else {
      // Log active assignment for dev audit
      console.log(`[ABTest] Active Assignment for ${testName}: Variant ${assigned}`);
    }

    setVariant(assigned);
  }, [testName]);

  return variant;
}
