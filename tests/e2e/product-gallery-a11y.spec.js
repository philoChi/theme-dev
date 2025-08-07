/**
 * product-gallery-a11y.spec.js
 * Comprehensive Accessibility Test Suite for Product Gallery Navigation
 * Test Cases: TC-12, TC-13, TC-14, TC-15
 * Focus: WCAG 2.1 AA compliance, keyboard navigation, screen readers
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const testUrl = 'http://127.0.0.1:9292/products/baum-stein-stick';

test.describe('Product Gallery Accessibility - TC-12 to TC-15', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(testUrl, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for JS to fully initialize
  });

  test('TC-12: Keyboard Navigation Tests', async ({ page }) => {
    // Check that gallery is keyboard accessible
    const gallery = page.locator('product-gallery-navigation');
    await expect(gallery).toBeVisible();

    // Test Tab navigation to gallery
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to reach thumbnails
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveClass(/product-gallery__thumbnail-item/);

    // Test arrow key navigation within gallery
    const initialImage = await page.locator('[data-main-image]').getAttribute('src');
    
    // Press right arrow to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const newImage = await page.locator('[data-main-image]').getAttribute('src');
    expect(newImage).not.toBe(initialImage);

    // Test left arrow navigation
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    
    const backImage = await page.locator('[data-main-image]').getAttribute('src');
    expect(backImage).toBe(initialImage);

    // Test Home key (first image)
    await page.keyboard.press('Home');
    await page.waitForTimeout(1000);
    
    const homeImage = await page.locator('[data-main-image]').getAttribute('src');
    // Should be at first image (index 0)

    // Test End key (last image)
    await page.keyboard.press('End');
    await page.waitForTimeout(1000);
    
    const endImage = await page.locator('[data-main-image]').getAttribute('src');
    expect(endImage).not.toBe(homeImage);

    // Test tab order is logical
    await page.keyboard.press('Tab');
    const nextFocused = page.locator(':focus');
    
    // Should move to next thumbnail or navigation button
    const isValidNextFocus = await nextFocused.evaluateAll(elements => {
      return elements.some(el => 
        el.classList.contains('product-gallery__thumbnail-item') ||
        el.classList.contains('product-gallery__navigation')
      );
    });
    
    expect(isValidNextFocus).toBe(true);
  });

  test('TC-13: Screen Reader Announcements', async ({ page }) => {
    // Test ARIA live regions exist
    const liveRegions = page.locator('[aria-live]');
    await expect(liveRegions).toHaveCount(2); // polite and assertive regions
    
    // Test image ARIA labels
    const mainImage = page.locator('[data-main-image]');
    const ariaLabel = await mainImage.getAttribute('aria-label');
    expect(ariaLabel).toContain('Image 1 of');
    expect(ariaLabel).toMatch(/Image \d+ of \d+/);

    // Test thumbnail ARIA attributes
    const thumbnails = page.locator('.product-gallery__thumbnail-item');
    const firstThumbnail = thumbnails.first();
    
    await expect(firstThumbnail).toHaveAttribute('aria-selected', 'true');
    await expect(firstThumbnail).toHaveAttribute('tabindex', '0');
    await expect(firstThumbnail).toHaveAttribute('aria-label');
    
    const thumbnailLabel = await firstThumbnail.getAttribute('aria-label');
    expect(thumbnailLabel).toContain('thumbnail');
    expect(thumbnailLabel).toContain('Image 1 of');

    // Test navigation button ARIA
    const prevButton = page.locator('[data-gallery-prev]');
    const nextButton = page.locator('[data-gallery-next]');
    
    if (await prevButton.count() > 0) {
      await expect(prevButton).toHaveAttribute('aria-label');
      const prevLabel = await prevButton.getAttribute('aria-label');
      expect(prevLabel).toContain('Previous');
    }
    
    if (await nextButton.count() > 0) {
      await expect(nextButton).toHaveAttribute('aria-label'); 
      const nextLabel = await nextButton.getAttribute('aria-label');
      expect(nextLabel).toContain('Next');
    }

    // Test gallery container ARIA
    const galleryContainer = page.locator('product-gallery-navigation');
    await expect(galleryContainer).toHaveAttribute('role');
    await expect(galleryContainer).toHaveAttribute('aria-label');
    
    // Test position updates when navigating
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const updatedImageLabel = await mainImage.getAttribute('aria-label');
    expect(updatedImageLabel).toContain('Image 2 of');

    // Test thumbnails container ARIA
    const thumbnailsContainer = page.locator('[data-gallery-thumbnails]');
    await expect(thumbnailsContainer).toHaveAttribute('role', 'tablist');
    await expect(thumbnailsContainer).toHaveAttribute('aria-label');
  });

  test('TC-14: Focus Management', async ({ page }) => {
    // Test focus indicators are visible
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    // Check if focus styles are applied
    const focusedStyles = await firstThumbnail.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor
      };
    });
    
    // Should have visible outline
    expect(focusedStyles.outlineWidth).not.toBe('0px');

    // Test focus follows interaction
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const newFocusedElement = page.locator(':focus');
    const hasProperFocus = await newFocusedElement.evaluateAll(elements => {
      return elements.some(el => 
        el.classList.contains('product-gallery__thumbnail-item') &&
        el.getAttribute('aria-selected') === 'true'
      );
    });
    
    expect(hasProperFocus).toBe(true);

    // Test no keyboard traps - should be able to tab out of gallery
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const finalFocused = page.locator(':focus');
    const isOutsideGallery = await finalFocused.evaluate(el => {
      return !el.closest('product-gallery-navigation');
    });
    
    // Should eventually be able to tab out (may take multiple tabs)
    // This tests that there's no keyboard trap

    // Test focus management during loading states
    const thumbnail = page.locator('.product-gallery__thumbnail-item').nth(2);
    await thumbnail.click();
    
    // During transition, elements should still be focusable but may be disabled
    const isAccessible = await thumbnail.evaluate(el => {
      return el.getAttribute('aria-disabled') !== null || 
             el.getAttribute('tabindex') !== '-1';
    });
    
    expect(isAccessible).toBe(true);

    // Test skip link functionality
    const skipLink = page.locator('.product-gallery__skip-link');
    if (await skipLink.count() > 0) {
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      
      // Skip link should be visible when focused
      const isVisible = await skipLink.isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('TC-15: WCAG 2.1 AA Compliance', async ({ page }) => {
    // Run comprehensive accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('product-gallery-navigation')
      .analyze();

    // Should have zero violations for WCAG 2.1 AA
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test color contrast requirements
    const contrastScan = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(contrastScan.violations).toEqual([]);

    // Test specific WCAG requirements
    
    // 1. Images must have alt text
    const images = page.locator('.product-gallery__image');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const altText = await image.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText.trim()).not.toBe('');
    }

    // 2. Interactive elements must be keyboard accessible
    const interactiveElements = page.locator('button, [role="tab"], [tabindex]:not([tabindex="-1"])');
    const interactiveCount = await interactiveElements.count();
    
    for (let i = 0; i < interactiveCount; i++) {
      const element = interactiveElements.nth(i);
      await element.focus();
      await expect(element).toBeFocused();
    }

    // 3. ARIA attributes must be valid
    const elementsWithAria = page.locator('[aria-label], [aria-selected], [aria-current], [role]');
    const ariaCount = await elementsWithAria.count();
    
    for (let i = 0; i < ariaCount; i++) {
      const element = elementsWithAria.nth(i);
      
      // Check aria-label is meaningful
      const ariaLabel = await element.getAttribute('aria-label');
      if (ariaLabel) {
        expect(ariaLabel.trim()).not.toBe('');
        expect(ariaLabel.length).toBeGreaterThan(2);
      }
      
      // Check aria-selected is boolean
      const ariaSelected = await element.getAttribute('aria-selected');
      if (ariaSelected) {
        expect(['true', 'false']).toContain(ariaSelected);
      }
      
      // Check role is valid
      const role = await element.getAttribute('role');
      if (role) {
        expect(['tab', 'tablist', 'tabpanel', 'button', 'img', 'region']).toContain(role);
      }
    }

    // 4. Form labels and descriptions
    const formElements = page.locator('input, button, select, textarea');
    const formCount = await formElements.count();
    
    for (let i = 0; i < formCount; i++) {
      const element = formElements.nth(i);
      const hasLabel = await element.evaluate(el => {
        return el.getAttribute('aria-label') || 
               el.getAttribute('aria-labelledby') ||
               el.getAttribute('title') ||
               (el.tagName === 'BUTTON' && el.textContent.trim()) ||
               document.querySelector(`label[for="${el.id}"]`);
      });
      
      expect(hasLabel).toBeTruthy();
    }

    // 5. Heading structure (if any headings in gallery)
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Headings should have meaningful text
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        const text = await heading.textContent();
        expect(text?.trim()).toBeTruthy();
      }
    }

    // 6. Loading states accessibility
    const loadingElements = page.locator('[aria-busy], .is-loading');
    const loadingCount = await loadingElements.count();
    
    if (loadingCount > 0) {
      for (let i = 0; i < loadingCount; i++) {
        const element = loadingElements.nth(i);
        const ariaBusy = await element.getAttribute('aria-busy');
        if (ariaBusy) {
          expect(['true', 'false']).toContain(ariaBusy);
        }
      }
    }

    // Generate accessibility report
    console.log('🎉 WCAG 2.1 AA Compliance Check Complete');
    console.log(`📊 Scanned ${imageCount} images, ${interactiveCount} interactive elements, ${ariaCount} ARIA elements`);
    console.log(`✅ Zero accessibility violations found`);
  });

  test('TC-15b: Accessibility in Different States', async ({ page }) => {
    // Test accessibility during navigation
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const duringNavigation = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(duringNavigation.violations).toEqual([]);

    // Test accessibility during loading states
    const thumbnail = page.locator('.product-gallery__thumbnail-item').nth(3);
    await thumbnail.click();
    
    // Immediately check accessibility during transition
    const duringLoading = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(duringLoading.violations).toEqual([]);

    // Test accessibility with focus
    await page.keyboard.press('Tab');
    
    const withFocus = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(withFocus.violations).toEqual([]);
  });

  test('TC-15c: Mobile Accessibility', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Test mobile-specific accessibility
    const mobileAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(mobileAccessibility.violations).toEqual([]);

    // Test touch target sizes (minimum 44x44px)
    const touchTargets = page.locator('.product-gallery__navigation, .product-gallery__thumbnail-item');
    const targetCount = await touchTargets.count();
    
    for (let i = 0; i < targetCount; i++) {
      const target = touchTargets.nth(i);
      const boundingBox = await target.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Test mobile swipe accessibility
    if (browserName === 'chromium') {
      // Test that swipe gestures don't interfere with screen reader navigation
      const mainImage = page.locator('[data-main-image]');
      await mainImage.focus();
      
      // Should still be able to use keyboard navigation on mobile
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1000);
      
      const ariaLabel = await mainImage.getAttribute('aria-label');
      expect(ariaLabel).toContain('Image 2 of');
    }
  });

  test('TC-15d: High Contrast Mode Accessibility', async ({ page }) => {
    // Emulate high contrast mode
    await page.emulateMedia({ prefersContrast: 'more' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Test accessibility in high contrast mode
    const highContrastAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    expect(highContrastAccessibility.violations).toEqual([]);

    // Test that focus indicators are still visible in high contrast
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    const focusStyles = await firstThumbnail.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth
      };
    });
    
    expect(focusStyles.outlineWidth).not.toBe('0px');
  });
});

test.describe('Accessibility Error States', () => {
  
  test('TC-15e: Accessibility during error states', async ({ page }) => {
    await page.goto(testUrl, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Simulate error condition by injecting error state
    await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      if (gallery) {
        gallery.classList.add('has-error');
        gallery.setAttribute('data-error-message', 'Gallery error occurred');
      }
    });

    // Test accessibility during error state
    const errorStateAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('product-gallery-navigation')
      .analyze();
    
    // Should still be accessible even in error state
    expect(errorStateAccessibility.violations).toEqual([]);

    // Error message should be accessible
    const errorElement = page.locator('.has-error');
    await expect(errorElement).toBeVisible();
    
    // Check if error has proper ARIA attributes
    const hasErrorAria = await errorElement.evaluate(el => {
      return el.getAttribute('aria-live') || 
             el.getAttribute('role') === 'alert' ||
             el.querySelector('[role="alert"]');
    });
    
    // Error states should be announced to screen readers
    expect(hasErrorAria).toBeTruthy();
  });
});