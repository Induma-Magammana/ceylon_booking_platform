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
    getAuthenticatedClient: vi.fn(() => mockSupabase),
}));

import { getSupabaseClient, getAuthenticatedClient } from '@/utils/supabase';
import { app } from '@/api/index';

describe('Bookings API Integration Tests', () => {

    const createMockChain = (data: any, error: any = null) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
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
            data: { user: { id: 'tourist-user-id', email: 'tourist@example.com' } },
            error: null
        });
    });

    describe('POST /api/bookings/check-availability', () => {
        it('should return available for empty slot', async () => {
            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'listings') {
                    return createMockChain({
                        id: 'listing-1',
                        capacity: 10,
                        inventory_type: 'slot'
                    });
                }
                if (tableName === 'bookings') {
                    // No existing bookings
                    return createMockChain([]);
                }
                return createMockChain([]);
            });

            const res = await app.fetch(
                new Request('http://localhost/api/bookings/check-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listingId: 'listing-1',
                        bookingDate: '2026-03-01',
                        quantity: 2
                    }),
                })
            );

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.available).toBe(true);
            expect(body.remainingCapacity).toBeDefined();
        });

        it('should return unavailable for full slot', async () => {
            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'listings') {
                    return createMockChain({
                        id: 'listing-1',
                        capacity: 10,
                        inventory_type: 'slot'
                    });
                }
                if (tableName === 'bookings') {
                    // All spots taken
                    return createMockChain([
                        { quantity: 5 },
                        { quantity: 5 }
                    ]);
                }
                return createMockChain([]);
            });

            const res = await app.fetch(
                new Request('http://localhost/api/bookings/check-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listingId: 'listing-1',
                        bookingDate: '2026-03-01',
                        quantity: 1
                    }),
                })
            );

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.available).toBe(false);
        });
    });

    describe('GET /api/tourists/:id/bookings', () => {
        it('should return bookings for authenticated tourist', async () => {
            const mockBookings = [
                { id: 'booking-1', booking_date: '2026-03-01', status: 'confirmed', quantity: 2 },
                { id: 'booking-2', booking_date: '2026-03-15', status: 'pending', quantity: 1 },
            ];

            mockFrom.mockReturnValue(createMockChain(mockBookings));

            const res = await app.fetch(
                new Request('http://localhost/api/tourists/tourist-user-id/bookings', {
                    headers: { 'Authorization': 'Bearer test-token' }
                })
            );

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should return 401 without auth token', async () => {
            const res = await app.fetch(
                new Request('http://localhost/api/tourists/tourist-user-id/bookings')
            );

            expect(res.status).toBe(401);
        });

        it('should allow request but RLS filters results (ownership enforced by Supabase RLS)', async () => {
            mockFrom.mockReturnValue(createMockChain([]));

            const res = await app.fetch(
                new Request('http://localhost/api/tourists/other-user-id/bookings', {
                    headers: { 'Authorization': 'Bearer test-token' }
                })
            );

            // The API returns 200 — ownership filtering is handled by Supabase RLS,
            // not server-side. In production, RLS ensures only the user's own bookings
            // are returned. In this mocked test, the mock returns an empty array.
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/listings/:id/bookings (Host)', () => {
        beforeEach(() => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'host-user-id', email: 'host@example.com' } },
                error: null
            });
        });

        it('should return bookings for host\'s listing', async () => {
            const mockBookings = [
                { id: 'booking-1', booking_date: '2026-03-01', status: 'confirmed', quantity: 2 },
            ];

            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'listings') {
                    return createMockChain({
                        id: 'listing-1',
                        host_id: 'host-user-id'
                    });
                }
                if (tableName === 'bookings') {
                    return createMockChain(mockBookings);
                }
                return createMockChain([]);
            });

            const res = await app.fetch(
                new Request('http://localhost/api/listings/listing-1/bookings', {
                    headers: { 'Authorization': 'Bearer test-token' }
                })
            );

            expect(res.status).toBe(200);
        });
    });
});
