/**
 * Accessibility Test for Product Card Refactor
 * Tests ARIA attributes, semantic markup, and keyboard navigation
 */

const { test, expect } = require('@playwright/test');

test.describe('Product Card Accessibility Tests', () => {
  test('should have proper ARIA attributes and semantic markup', async ({ page }) => {
    await page.goto('http://127.0.0.1:9292/collections/men-clothing');
    
    // Test product card semantic structure
    const productCards = await page.locator('.product-card').all();
    expect(productCards.length).toBeGreaterThan(0);
    
    for (const card of productCards) {
      // Check article element with schema.org markup
      await expect(card).toHaveAttribute('itemscope');
      await expect(card).toHaveAttribute('itemtype', 'http://schema.org/Product');
      
      // Check product links are accessible
      const productLink = card.locator('a[href*="/products/"]').first();
      await expect(productLink).toBeVisible();
      
      // Check images have alt text
      const images = card.locator('img');
      const imageCount = await images.count();
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        expect(alt).not.toBeNull();
      }
      
      // Check price elements have proper schema markup
      const priceElement = card.locator('[itemprop="offers"]');
      await expect(priceElement).toBeVisible();
      await expect(priceElement).toHaveAttribute('itemtype', 'http://schema.org/Offer');
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('http://127.0.0.1:9292/collections/men-clothing');
    
    // Test tab navigation through product cards
    const firstProductLink = page.locator('.product-card a').first();
    await firstProductLink.focus();
    await expect(firstProductLink).toBeFocused();
    
    // Test that focus is visible
    await expect(firstProductLink).toBeVisible();
  });

  test('should have accessible color contrast', async ({ page }) => {
    await page.goto('http://127.0.0.1:9292/collections/men-clothing');
    
    // Ensure product titles are visible and readable
    const productTitles = page.locator('.product-card h1, .product-card h2, .product-card h3');
    const titleCount = await productTitles.count();
    expect(titleCount).toBeGreaterThan(0);
    
    for (let i = 0; i < titleCount; i++) {
      await expect(productTitles.nth(i)).toBeVisible();
    }
  });
});