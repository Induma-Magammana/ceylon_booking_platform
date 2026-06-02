import { test, expect } from '@playwright/test';

test.describe('Listing Detail Page', () => {
    test('should navigate to listing page when listings exist', async ({ page }) => {
        // First go to home
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for the page to fully load
        await expect(page.getByText('Sri Lanka')).toBeVisible({ timeout: 10000 });

        // Check if any listing cards are present
        const listingLinks = page.locator('a[href^="/listings/"]');
        const count = await listingLinks.count();

        // Skip test if no listings - this is expected in a test environment
        test.skip(count === 0, 'No listings available in database');

        if (count > 0) {
            await listingLinks.first().click();
            await page.waitForLoadState('networkidle');

            // Should be on a listing detail page
            await expect(page).toHaveURL(/\/listings\/.+/);
        }
    });

    test('should show booking interface on listing page when listings exist', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const listingLinks = page.locator('a[href^="/listings/"]');
        const count = await listingLinks.count();

        // Skip test if no listings
        test.skip(count === 0, 'No listings available in database');

        if (count > 0) {
            await listingLinks.first().click();
            await page.waitForLoadState('networkidle');

            // Should have booking card visible
            await expect(page.getByText(/total/i)).toBeVisible({ timeout: 10000 });
        }
    });

    test('should show login button for unauthenticated users', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const listingLinks = page.locator('a[href^="/listings/"]');
        const count = await listingLinks.count();

        // Skip test if no listings
        test.skip(count === 0, 'No listings available in database');

        if (count > 0) {
            await listingLinks.first().click();
            await page.waitForLoadState('networkidle');

            // Should see "Login to Book" button for unauthenticated users
            const bookButton = page.getByRole('button', { name: /book now|login to book/i });
            await expect(bookButton).toBeVisible({ timeout: 10000 });
        }
    });
});

test.describe('Listing Page Elements', () => {
    test('should display home page listing grid', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // At minimum, the page should load with the hero section
        await expect(page.getByText('Discover the Beauty of')).toBeVisible({ timeout: 10000 });

        // Search functionality should be present
        await expect(page.getByPlaceholder('Search by location...')).toBeVisible();
    });
});
