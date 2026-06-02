import { test, expect } from '@playwright/test';

test.describe('API Health Check', () => {
    test('should return healthy status from API', async ({ request }) => {
        const response = await request.get('/health');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
    });
});

test.describe('Listings API', () => {
    test('should return listings array', async ({ request }) => {
        const response = await request.get('/api/listings');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    test('should filter listings by location', async ({ request }) => {
        const response = await request.get('/api/listings?location=Mirissa');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('should filter listings by inventory type', async ({ request }) => {
        const response = await request.get('/api/listings?inventoryType=slot');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.success).toBe(true);
    });
});

test.describe('Auth API', () => {
    test('should reject login with invalid credentials', async ({ request }) => {
        const response = await request.post('/api/auth/login', {
            data: {
                email: 'invalid@example.com',
                password: 'wrongpassword',
            },
        });

        // Should return 401 for invalid credentials
        expect(response.status()).toBe(401);
    });

    test('should reject signup with invalid email', async ({ request }) => {
        const response = await request.post('/api/auth/signup', {
            data: {
                email: 'not-an-email',
                password: 'password123',
                fullName: 'Test User',
                userType: 'tourist',
            },
        });

        // Should return 400 for validation error
        expect(response.status()).toBe(400);
    });

    test('should reject signup with short password', async ({ request }) => {
        const response = await request.post('/api/auth/signup', {
            data: {
                email: 'test@example.com',
                password: '123',
                fullName: 'Test User',
                userType: 'tourist',
            },
        });

        // Should return 400 for validation error
        expect(response.status()).toBe(400);
    });
});

test.describe('Protected Endpoints', () => {
    test('should reject booking creation without auth', async ({ request }) => {
        const response = await request.post('/api/bookings', {
            data: {
                listingId: 'some-id',
                bookingDate: '2026-03-01',
                quantity: 1,
            },
        });

        // Should return 401 for unauthorized
        expect(response.status()).toBe(401);
    });

    test('should reject listing creation without auth', async ({ request }) => {
        const response = await request.post('/api/listings', {
            data: {
                title: 'Test Listing',
                location: 'Test Location',
                inventoryType: 'slot',
                localPrice: 1000,
                foreignPrice: 10,
                capacity: 10,
            },
        });

        // Should return 401 for unauthorized
        expect(response.status()).toBe(401);
    });
});
