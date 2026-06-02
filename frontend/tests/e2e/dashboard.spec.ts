import { test, expect } from '@playwright/test';

test.describe('Host Dashboard', () => {
    test('should redirect non-authenticated users to home from dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should redirect to home since not authenticated
        await expect(page).toHaveURL('/');
    });

    test('should redirect non-authenticated users to home from create listing', async ({ page }) => {
        await page.goto('/dashboard/create-listing');
        await page.waitForLoadState('networkidle');

        // Should redirect to home since not authenticated or not a host
        await expect(page).toHaveURL('/');
    });
});

test.describe('Create Listing Page', () => {
    test('should have host option in signup form', async ({ page }) => {
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder(/select account type/i).click();
        await expect(page.getByText(/host/i).first()).toBeVisible();
    });
});

test.describe('Dashboard Navigation', () => {
    test('should show both user types in signup dropdown', async ({ page }) => {
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Create your account')).toBeVisible({ timeout: 10000 });

        // Open user type dropdown
        await page.getByPlaceholder(/select account type/i).click();

        // Both options should be available
        await expect(page.getByText(/tourist/i).first()).toBeVisible();
        await expect(page.getByText(/host/i).first()).toBeVisible();
    });
});
