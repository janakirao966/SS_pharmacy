import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexHtml = path.join(distDir, 'index.html');
const fallbackHtml = path.join(distDir, '404.html');

try {
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, fallbackHtml);
    console.log('✓ Successfully created dist/404.html for SPA routing fallback');
  } else {
    console.warn('⚠ dist/index.html not found, skipping 404.html copy');
  }
} catch (err) {
  console.error('Error copying 404.html:', err);
}
