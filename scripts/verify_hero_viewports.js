import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const viewports = [
  { width: 320, height: 740, name: '320px' },
  { width: 360, height: 780, name: '360px' },
  { width: 375, height: 812, name: '375px' },
  { width: 390, height: 844, name: '390px' },
  { width: 412, height: 892, name: '412px' },
  { width: 430, height: 932, name: '430px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 1024, height: 768, name: '1024px' },
  { width: 1280, height: 800, name: '1280px' },
  { width: 1440, height: 900, name: '1440px' }
];

const artifactDir = 'C:\\Users\\janak\\.gemini\\antigravity-ide\\brain\\5f55023b-f641-4660-89a6-1a552cf96151';

async function runVerification() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Starting Playwright hero & lower sections verification...');
  const results = {};

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const overflowPass = scrollWidth <= clientWidth;

    results[vp.name] = {
      clientWidth,
      scrollWidth,
      overflowPass
    };

    console.log(`Viewport ${vp.name}: clientWidth=${clientWidth}, scrollWidth=${scrollWidth}, overflowPass=${overflowPass}`);

    if (['390px', '1440px'].includes(vp.name)) {
      const sections = ['home-about-section', 'home-manufacturing-section', 'home-trust-band-section', 'home-mission-section'];
      for (const sec of sections) {
        const el = await page.$(`.${sec}`);
        if (el) {
          const pth = path.join(artifactDir, `${sec}_${vp.name}.png`);
          await el.screenshot({ path: pth });
          console.log(`Saved screenshot: ${pth}`);
        }
      }
    }
  }

  await browser.close();
  fs.writeFileSync('verification_results.json', JSON.stringify(results, null, 2));
  console.log('Verification finished cleanly!');
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
