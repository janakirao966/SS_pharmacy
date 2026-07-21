import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Audits', () => {
  // Common paths to audit for accessibility
  const paths = [
    '',
    'products',
    'contact',
    'about',
  ];

  for (const path of paths) {
    test(`Should not have any automatically detectable accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      
      // Wait for the page content to be stable
      await page.waitForLoadState('networkidle');

      // Execute Axe audit
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
