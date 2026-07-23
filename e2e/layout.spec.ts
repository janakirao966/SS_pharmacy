import { test, expect } from "@playwright/test";

test.describe("Homepage Layout & Visual Elements", () => {
  test("should render home page with correct document title", async ({ page }) => {
    await page.goto("");
    await expect(page).toHaveTitle(/S\.S\. PHARMACY/i);
  });

  test("should render navigation header with active page indicator", async ({ page }) => {
    await page.goto("");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
    
    // Check for logo or branding text
    const brand = page.locator("header, nav, .logo-title, .logo-text").filter({ hasText: /S\.S\.\s*Pharmacy/i }).first();
    await expect(brand).toBeVisible();
  });

  test("should contain key home page sections", async ({ page }) => {
    await page.goto("");
    // Hero carousel slider container should be visible
    const heroSlider = page.locator(".home-page, .hero-slider-container, .hero-carousel, .hero-container").first();
    await expect(heroSlider).toBeVisible();

    // Key features section or page container text
    const features = page.locator("body").filter({ hasText: /quality|cert/i }).first();
    await expect(features).toBeVisible();
  });

  test("should display products showcase", async ({ page }) => {
    await page.goto("");
    const heading = page.locator("h1, h2, h3, .section-title, .eyebrow-badge").filter({ hasText: /Products|Featured|Ayurvedic|Herb|Bottle/i }).first();
    await expect(heading).toBeVisible();
  });
});

test.describe("Products Page & Navigation", () => {
  test("should navigate to products page and display items", async ({ page }) => {
    await page.goto("products");
    // Wait for Suspense loading state to detach
    await page.locator('text=Loading formulations...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    
    const heading = page.locator("h1, h2, h3").filter({ hasText: /Products|Ayurvedic/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check that at least one product card is rendered
    const productCard = page.locator(".product-catalog-card-outer, .product-catalog-card").first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Contact Form Usability", () => {
  test("should render contact form with fields", async ({ page }) => {
    await page.goto("contact");
    // Wait for Suspense loading state to detach
    await page.locator('text=Loading formulations...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    const nameInput = page.locator('input[name="name"], input[type="text"], input#name').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    
    const emailInput = page.locator('input[name="email"], input[type="email"], input#email').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Visual Regression Checks", () => {
  test("homepage visual check", async ({ page }) => {
    await page.goto("");
    await page.waitForTimeout(1000); // Allow animations to settle
    await expect(page).toHaveScreenshot("homepage.png", { fullPage: true, maxDiffPixelRatio: 0.08 });
  });

  test("about page visual check", async ({ page }) => {
    await page.goto("about");
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("about.png", { fullPage: true, maxDiffPixelRatio: 0.08 });
  });
});
