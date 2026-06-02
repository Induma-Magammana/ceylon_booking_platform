import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
    test('should navigate between pages correctly', async ({ page }) => {
        // Start at home
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Discover the Beauty of')).toBeVisible({ timeout: 10000 });

        // Go to login
        await page.getByText('Login').click();
        await expect(page).toHaveURL('/login');
        await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10000 });

        // Go to signup
        await page.getByText('Create account').click();
        await expect(page).toHaveURL('/signup');

        // Back to home via logo
        await page.getByText('CeylonBooking').click();
        await expect(page).toHaveURL('/');
    });

    test('should redirect unauthenticated users from my-bookings', async ({ page }) => {
        await page.goto('/my-bookings');
        await page.waitForLoadState('networkidle');

        // Should redirect to login since not authenticated
        await expect(page).toHaveURL('/login');
    });

    test('should redirect non-hosts from dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should redirect since not authenticated or not a host
        await expect(page).toHaveURL('/');
    });
});

test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Hero should still be visible
        await expect(page.getByText('Sri Lanka')).toBeVisible({ timeout: 10000 });
    });

    test('should display properly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Sri Lanka')).toBeVisible({ timeout: 10000 });
    });
});
