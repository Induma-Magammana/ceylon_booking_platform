import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available for the factory
const { mockFrom, mockSupabase } = vi.hoisted(() => {
    const mockFrom = vi.fn();
    const mockSupabase = {
        from: mockFrom,
        auth: {
            getUser: vi.fn(),
        }
    };
    return { mockFrom, mockSupabase };
});

// Mock dependencies BEFORE importing the app
vi.mock('@/utils/supabase', () => ({
    getSupabaseClient: vi.fn(() => mockSupabase),
    getAuthenticatedClient: vi.fn(() => mockSupabase), // Both return the same mock for simplicity
}));

import { getSupabaseClient, getAuthenticatedClient } from '@/utils/supabase';
// Now import app, which will use the mocked client
import { app } from '@/api/index';

describe('API Integration Tests (Mocked DB)', () => {

    const createMockChain = (data: any, error: any = null) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        then: (resolve: any) => resolve({ data, error }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (getSupabaseClient as any).mockReturnValue(mockSupabase);
        (getAuthenticatedClient as any).mockReturnValue(mockSupabase);

        // Default auth success
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' } },
            error: null
        });
    });

    describe('POST /api/listings', () => {
        it('should create a listing successfully', async () => {
            // Mock DB: insert -> select -> single
            mockFrom.mockReturnValue(createMockChain({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', title: 'Test Listing' }));

            const res = await app.fetch(
                new Request('http://localhost/api/listings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-token'
                    },
                    body: JSON.stringify({
                        hostId: '550e8400-e29b-41d4-a716-446655440000', // Must match authenticated user
                        title: 'Test Listing',
                        description: 'Test description',
                        inventoryType: 'slot',
                        location: 'Colombo',
                        localPrice: 1000,
                        foreignPrice: 10,
                        capacity: 10,
                    }),
                })
            );

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should forbid creating listing for others', async () => {
            const res = await app.fetch(
                new Request('http://localhost/api/listings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-token'
                    },
                    body: JSON.stringify({
                        hostId: 'a3b8c2d4-e5f6-4a1b-9c8d-1a2b3c4d5e6f', // Mismatch
                        title: 'Test Listing',
                        inventoryType: 'slot',
                        location: 'Colombo',
                        localPrice: 1000,
                        foreignPrice: 10,
                        capacity: 10,
                    }),
                })
            );

            if (res.status !== 403) {
                const body = await res.json();
                console.log('Test 2 Failed Status:', res.status);
                console.log('Test 2 Response Body:', JSON.stringify(body));
            }
            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/bookings', () => {
        it('should create a booking with correct pricing', async () => {
            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'users') {
                    return createMockChain({
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        // Note: The previous test might have assumed a certain country
                        // Since PricingService uses country, we need to be explicit.
                        // Ideally we check country in pricing service.
                        // Let's assume the DB returns a user with a specific field.
                        // However, the User type defined has country optional.
                        // Let's check PricingService logic. It checks user.country === 'LK'.
                        // Our mock user needs to have this field.
                        country: 'LK',
                        user_type: 'tourist',
                        full_name: 'Test Tourist'
                    });
                }
                if (tableName === 'listings') {
                    return createMockChain({
                        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        host_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                        local_price: 5000,
                        foreign_price: 50,
                        capacity: 10,
                        inventory_type: 'slot'
                    });
                }
                if (tableName === 'bookings') {
                    return {
                        ...createMockChain([]),
                        insert: vi.fn().mockReturnValue(createMockChain({
                            id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                            status: 'pending'
                        })),
                        select: vi.fn().mockReturnValue(createMockChain([])),
                    };
                }
                return createMockChain([]);
            });

            const res = await app.fetch(
                new Request('http://localhost/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-token'
                    },
                    body: JSON.stringify({
                        listingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        // touristId: ... REMOVED, should be inferred from auth
                        bookingDate: '2026-02-15',
                        timeSlot: '10:00:00',
                        quantity: 2,
                    }),
                })
            );

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.price.currency).toBe('LKR');
        });

        it('should return 401 without token', async () => {
            const res = await app.fetch(
                new Request('http://localhost/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                })
            );

            expect(res.status).toBe(401);
        });
    });
});
