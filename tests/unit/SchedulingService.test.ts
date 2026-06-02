import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulingService } from '@/services/SchedulingService';

// Mock Supabase client
const mockSupabase = {
    from: vi.fn(),
};

describe('SchedulingService', () => {
    let service: SchedulingService;

    // Helper to create a mock query builder
    const createMockBuilder = (returnData: any = [], returnError: any = null) => {
        // We create a builder that returns itself for all filter methods
        // and returns the data for execution methods
        const builder: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
            // Make it thenable to support await query
            then: (resolve: any) => resolve({ data: returnData, error: returnError }),
        };
        return builder;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        service = new SchedulingService(mockSupabase as any);
    });

    describe('checkAvailability', () => {
        it('should return true when no conflicting bookings exist', async () => {
            // Mock listing capacity check
            const listingBuilder = createMockBuilder({ capacity: 10 });
            // Mock conflicting bookings check
            const bookingsBuilder = createMockBuilder([]);

            mockSupabase.from
                .mockReturnValueOnce(listingBuilder) // First call for listing
                .mockReturnValueOnce(bookingsBuilder); // Second call for bookings

            const result = await service.checkAvailability(
                'listing-123',
                new Date('2026-02-15'),
                '09:00:00',
                2
            );

            expect(result.available).toBe(true);
        });

        it('should return false when capacity is exceeded', async () => {
            // Mock existing bookings
            const existingBookings = [
                { quantity: 8 },
                { quantity: 5 },
            ];

            // Mock ONLY bookings call because we pass listing object manually
            mockSupabase.from.mockReturnValue(createMockBuilder(existingBookings));

            // Mock listing capacity fetch
            const listing = { capacity: 15 };
            const result = await service.checkAvailability(
                'listing-123',
                new Date('2026-02-15'),
                '09:00:00',
                3,
                listing
            );

            // 8 + 5 + 3 = 16 > 15 capacity
            expect(result.available).toBe(false);
        });

        it('should handle date-based bookings without time slot', async () => {
            // Mock listing capacity check
            const listingBuilder = createMockBuilder({ capacity: 5 });
            // Mock bookings check
            const bookingsBuilder = createMockBuilder([]);

            mockSupabase.from
                .mockReturnValueOnce(listingBuilder)
                .mockReturnValueOnce(bookingsBuilder);

            const result = await service.checkAvailability(
                'listing-123',
                new Date('2026-02-15'),
                null,
                1
            );

            expect(result.available).toBe(true);
        });
    });

    describe('detectConflicts', () => {
        it('should return empty array when no conflicts exist', async () => {
            mockSupabase.from.mockReturnValue(createMockBuilder([]));

            const conflicts = await service.detectConflicts(
                'listing-123',
                new Date('2026-02-15'),
                '09:00:00'
            );

            expect(conflicts).toEqual([]);
        });

        it('should return conflicting bookings', async () => {
            const conflictingBookings = [
                {
                    id: 'booking-1',
                    quantity: 5,
                    tourist_id: 'tourist-1',
                },
                {
                    id: 'booking-2',
                    quantity: 3,
                    tourist_id: 'tourist-2',
                },
            ];

            mockSupabase.from.mockReturnValue(createMockBuilder(conflictingBookings));

            const conflicts = await service.detectConflicts(
                'listing-123',
                new Date('2026-02-15'),
                '09:00:00'
            );

            expect(conflicts).toHaveLength(2);
            expect(conflicts[0].id).toBe('booking-1');
        });
    });

    describe('calculateRemainingCapacity', () => {
        it('should calculate remaining capacity correctly', () => {
            const existingBookings = [
                { quantity: 5 },
                { quantity: 3 },
                { quantity: 2 },
            ];

            const remaining = service.calculateRemainingCapacity(20, existingBookings as any);

            expect(remaining).toBe(10); // 20 - (5 + 3 + 2)
        });

        it('should return full capacity when no bookings', () => {
            const remaining = service.calculateRemainingCapacity(15, []);
            expect(remaining).toBe(15);
        });
    });
});
