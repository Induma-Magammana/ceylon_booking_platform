import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
    });

    test('should display the homepage with hero section', async ({ page }) => {
        // Check for hero title - use text matching
        await expect(page.getByText('Discover the Beauty of')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Sri Lanka')).toBeVisible();

        // Check for navigation
        await expect(page.locator('header')).toBeVisible();
    });

    test('should have search input', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search by location...');
        await expect(searchInput).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to login page', async ({ page }) => {
        // Wait for nav to be ready
        await expect(page.getByText('Login')).toBeVisible({ timeout: 10000 });

        await page.getByText('Login').click();
        await expect(page).toHaveURL('/login');
    });

    test('should navigate to signup page', async ({ page }) => {
        // Wait for nav to be ready
        await expect(page.getByText('Sign Up')).toBeVisible({ timeout: 10000 });

        await page.getByText('Sign Up').click();
        await expect(page).toHaveURL('/signup');
    });
});
