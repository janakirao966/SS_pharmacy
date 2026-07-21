import { test, expect } from "@playwright/test";

// Helper to dismiss cookie consent banner to avoid viewport click blocking
async function dismissCookieBanner(page: any) {
  try {
    const acceptBtn = page.locator('.btn-cookie-accept').first();
    if (await acceptBtn.isVisible({ timeout: 2000 })) {
      await acceptBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  } catch {
    // Banner was not displayed or already dismissed
  }
}

test.describe("B2B Distributor Form Submission (Mock API)", () => {
  test("should mock API response and successfully complete multi-step form submission", async ({ page }) => {
    // Intercept Web3Forms submit API
    await page.route("https://api.web3forms.com/submit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Mock Success" }),
      });
    });

    await page.goto("distributor");
    await page.locator('text=Loading formulations...').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await dismissCookieBanner(page);

    // Step 1: Company & Contact Details
    await page.locator('input[name="businessName"]').fill("Ayurveda Distributors Ltd");
    await page.locator('input[name="contactPerson"]').fill("Jane Doe");
    await page.locator('input[name="phone"]').fill("9494323211");
    await page.locator('input[name="email"]').fill("jane@ayurvedadist.com");
    await page.waitForTimeout(800); // Wait for debounced input validation (500ms)
    await page.click('button:has-text("Next Step")');

    // Step 2: Business Credentials
    await page.locator('input[name="location"]').fill("Kadapa, Andhra Pradesh");
    await page.selectOption('select[name="businessType"]', "distributor");
    await page.locator('input[name="yearsInBusiness"]').fill("5");
    await page.locator('input[name="regions"]').fill("Rayalaseema Region");
    await page.waitForTimeout(800); // Wait for validation debounce
    await page.click('button:has-text("Next Step")');

    // Step 3: Scope & Partnership Details
    await page.locator('textarea[name="message"]').fill("We want to distribute pain relief products in South India.");
    // Check B2B consent checkbox
    await page.click('input[name="consent"], .form-checkbox-wrapper input, label:has-text("I agree")');
    await page.waitForTimeout(800); // Wait for validation debounce

    // Submit
    await page.click('button:has-text("Submit Application")');

    // Verify success state
    const successHeading = page.locator('h3:has-text("Application Submitted")');
    await expect(successHeading).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Search Modal Hotkeys & Interactivity", () => {
  test("should toggle search modal using click trigger and execute search queries", async ({ page }) => {
    await page.goto("");
    await dismissCookieBanner(page);

    // Click search icon in navbar
    const searchBtn = page.locator('button[aria-label*="search"]:visible, button[aria-label*="Search"]:visible').first();
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    // Verify modal is open and input is visible & focused
    const searchInput = page.locator('.search-modal-input:visible').first();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    // Type query
    await searchInput.fill("Dr Lion");
    await page.waitForTimeout(500); // Allow debounce

    // Verify matching results displayed
    const results = page.locator('.search-results-list, .search-result-item, .search-results-box').first();
    await expect(results).toBeVisible();

    // Press Escape to close modal
    await page.keyboard.press("Escape");
    await expect(searchInput).not.toBeVisible();
  });

  test("should open search modal using global keyboard shortcut on desktop", async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip(true, "Global shortcuts are targeted at desktop screen sizes");
      return;
    }

    await page.goto("");
    await dismissCookieBanner(page);

    // Focus body and press Ctrl+k
    await page.focus('body');
    await page.keyboard.press("Control+KeyK");

    const searchInput = page.locator('.search-modal-input:visible').first();
    await expect(searchInput).toBeVisible();
  });
});

test.describe("B2B Cart Workflow Operations", () => {
  test("should add item, adjust quantities in drawer, and clear cart successfully", async ({ page }) => {
    // Print browser console errors/messages
    page.on("console", msg => console.log(`[BROWSER CONSOLE]: ${msg.text()}`));
    page.on("pageerror", err => console.log(`[BROWSER ERROR]: ${err.message}`));

    await page.goto("products");
    await page.locator('text=Loading formulations...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await dismissCookieBanner(page);
    await page.waitForTimeout(1000); // Wait for page to fully settle and layout shifts to finish

    // Click Add on first product card
    const addBtn = page.locator('.product-actions button').filter({ hasText: 'Add' }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await addBtn.click();

    // Verify Cart count badge displays '1' (using the correct class selector: .cart-badge-count)
    const cartBadge = page.locator('.cart-badge-count:visible').first();
    await expect(cartBadge).toHaveText("1", { timeout: 8000 });

    // Open Cart Drawer
    const cartBtn = page.locator('button[aria-label*="Bag"]:visible, button[aria-label*="cart"]:visible, button[aria-label*="Cart"]:visible').first();
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    // Verify drawer and product in cart is visible
    const cartDrawer = page.locator('.cart-drawer-overlay:visible, .cart-drawer-panel:visible').first();
    await expect(cartDrawer).toBeVisible();
    
    // Wait for the drawer transition animation to settle
    await page.waitForTimeout(1000);

    // Verify initial quantity in drawer is 1
    const quantityText = page.locator('.quantity-adjuster span').first();
    await expect(quantityText).toHaveText("1");

    // Increment quantity
    const plusBtn = page.locator('.quantity-adjuster button:has-text("+"):visible, button[aria-label*="Increase"]:visible').first();
    await plusBtn.click();

    // Verify quantity updates to 2 inside the drawer
    await expect(quantityText).toHaveText("2", { timeout: 8000 });

    // Register native dialog handler to accept window.confirm
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Remove");
      await dialog.accept();
    });

    // Click remove item button
    const removeBtn = page.locator('.cart-item-remove:visible').first();
    await removeBtn.click();

    // Verify cart count badge is gone (cart is empty)
    await expect(cartBadge).not.toBeVisible();
  });
});

test.describe("Accessibility Focus Trapping", () => {
  test("should trap focus inside Search modal when active", async ({ page }) => {
    await page.goto("");
    await dismissCookieBanner(page);

    // Open search modal via visible button click
    const searchBtn = page.locator('button[aria-label*="search"]:visible, button[aria-label*="Search"]:visible').first();
    await searchBtn.click();

    const searchInput = page.locator('.search-modal-input:visible').first();
    await expect(searchInput).toBeFocused();

    // Tab multiple times to verify focus trap cycles within search dialog elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Verify focus is still within the modal container (e.g. not on background layout links)
    const activeElementId = await page.evaluate(() => {
      let active = document.activeElement;
      if (!active) return null;
      let isInside = active.closest('.search-modal-container, .search-modal, [role="dialog"], .modal-overlay');
      return isInside ? 'inside' : 'outside';
    });
    expect(activeElementId).toBe("inside");
  });
});

test.describe("PWA Service Worker Verification", () => {
  test("should register service worker successfully on load", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle").catch(() => {});
    
    // Check if service worker is registered in browser window context
    const isSwRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
    expect(isSwRegistered).toBe(true);
  });
});


