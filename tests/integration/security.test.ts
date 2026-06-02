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

import { app } from '@/api/index';
import { getSupabaseClient } from '@/utils/supabase';

describe('Security Integration Tests', () => {

    const createMockChain = (data: any, error: any = null) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'new-booking-id' }, error: null })
            })
        }),
        then: (resolve: any) => resolve({ data, error }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (getSupabaseClient as any).mockReturnValue(mockSupabase);
    });

    describe('POST /api/bookings (Security)', () => {
        it('should ignore touristId from body and use authenticated user', async () => {
            const authUserId = 'auth-user-id';
            const bodyTouristId = 'hacker-id';

            // Mock Auth User
            mockSupabase.auth.getUser.mockResolvedValue({
                data: {
                    user: {
                        id: authUserId,
                        email: 'auth@test.com',
                        user_metadata: { full_name: 'Auth User', user_type: 'tourist' } // Supabase User Metadata
                    }
                },
                error: null
            });

            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'users') {
                    // Start of the chain for user fetching
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockImplementation((col, val) => {
                            // IMPORTANT: Verify we query for the AUTH ID, not the body ID
                            if (col === 'id' && val === authUserId) {
                                // Return correct user
                                return createMockChain({
                                    id: authUserId,
                                    user_type: 'tourist',
                                    full_name: 'Auth User',
                                    created_at: new Date().toISOString()
                                });
                            }
                            return createMockChain(null, { message: 'User not found' });
                        }),
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
                    };
                }
                if (tableName === 'listings') {
                    return createMockChain({
                        id: 'listing-1',
                        host_id: 'host-1',
                        local_price: 100,
                        foreign_price: 200,
                        capacity: 10,
                        inventory_type: 'slot',
                        created_at: new Date().toISOString()
                    });
                }
                if (tableName === 'bookings') {
                    // Availability check chain
                    return createMockChain([]);
                }
                return createMockChain([]);
            });


            const res = await app.fetch(
                new Request('http://localhost/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer valid-token'
                    },
                    body: JSON.stringify({
                        listingId: 'listing-1',
                        touristId: bodyTouristId, // This should be IGNORED
                        bookingDate: '2026-02-15',
                        quantity: 1,
                    }),
                })
            );

            expect(res.status).toBe(201);

            // Verify Supabase insert call used the correct tourist_id
            // This is tricky with the mock chain, but we can check the implementation behavior
            // or simply trust that if the user fetch failed (because we mocked it to fail for bodyTouristId), then we wouldn't reach 201.

            // We can also spy on the insert args if we refine the mock.
            // But relying on the user fetch mock sensitivity above is a strong signal.
        });
    });

    describe('Availability Check (RLS Pre-flight)', () => {
        it('should throw error if RLS blocks reading bookings', async () => {
            // Mock RLS error
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: null, error: { code: '42501', message: 'RLS violation' } })
            });

            // Check listing exists first
            // The service fetches listing if not provided. Ideally we pass it or mock that too.
            // Our service fetches listings. Let's make the FIRST call (listings) succeed, and SECOND (bookings) fail.

            mockFrom.mockImplementationOnce(() => createMockChain({ id: 'l1', capacity: 10 })) // listings
                .mockImplementationOnce(() => ({ // bookings
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    neq: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    then: (resolve: any) => resolve({ data: null, error: { code: '42501', message: 'RLS violation' } })
                }));

            const res = await app.fetch(
                new Request('http://localhost/api/bookings/check-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listingId: 'l1',
                        bookingDate: '2026-02-15',
                        quantity: 1
                    }),
                })
            );

            expect(res.status).toBe(400); // Or 500 depending on how we handle the throw
            const body = await res.json();
            expect(body.error).toContain('Permission denied');
        })
    });
});
