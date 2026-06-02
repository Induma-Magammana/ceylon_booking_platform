import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.waitForLoadState('networkidle');
        });

        test('should display login form', async ({ page }) => {
            await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10000 });
            await expect(page.getByLabel(/email/i)).toBeVisible();
            await expect(page.getByLabel(/password/i)).toBeVisible();
            await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
        });

        test('should have link to signup', async ({ page }) => {
            await expect(page.getByText(/don't have an account/i)).toBeVisible({ timeout: 10000 });
            await page.getByText('Create account').click();
            await expect(page).toHaveURL('/signup');
        });
    });

    test.describe('Signup Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/signup');
            await page.waitForLoadState('networkidle');
        });

        test('should display signup form', async ({ page }) => {
            await expect(page.getByText('Create your account')).toBeVisible({ timeout: 10000 });
            await expect(page.getByLabel(/full name/i)).toBeVisible();
            await expect(page.getByLabel(/email/i)).toBeVisible();
            await expect(page.getByLabel(/password/i)).toBeVisible();
        });

        test('should have user type selection', async ({ page }) => {
            await expect(page.getByPlaceholder(/select account type/i)).toBeVisible({ timeout: 10000 });
            await page.getByPlaceholder(/select account type/i).click();

            // Check dropdown options
            await expect(page.getByText(/tourist/i).first()).toBeVisible();
        });

        test('should have link to login', async ({ page }) => {
            await expect(page.getByText(/already have an account/i)).toBeVisible({ timeout: 10000 });
            await page.getByText('Sign in').click();
            await expect(page).toHaveURL('/login');
        });
    });
});
