import { describe, it, expect } from 'vitest';
import { Booking, BookingSchema, BookingStatus, Currency } from '@/domain/Booking';

describe('Booking Domain Model', () => {
    describe('Booking Creation', () => {
        it('should create a valid slot-based booking with time', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '09:00:00',
                quantity: 2,
                totalPrice: 10000,
                currency: 'LKR' as Currency,
                status: 'confirmed' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.timeSlot).toBe('09:00:00');
            }
        });

        it('should create a valid date-based booking without time slot', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: null,
                quantity: 1,
                totalPrice: 80,
                currency: 'USD' as Currency,
                status: 'confirmed' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.timeSlot).toBeNull();
            }
        });

        it('should accept pending booking status', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '10:00:00',
                quantity: 1,
                totalPrice: 5000,
                currency: 'LKR' as Currency,
                status: 'pending' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.status).toBe('pending');
            }
        });

        it('should reject negative quantity', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '09:00:00',
                quantity: -1,
                totalPrice: 5000,
                currency: 'LKR' as Currency,
                status: 'pending' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(false);
        });

        it('should reject zero quantity', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '09:00:00',
                quantity: 0,
                totalPrice: 5000,
                currency: 'LKR' as Currency,
                status: 'pending' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid currency', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '09:00:00',
                quantity: 1,
                totalPrice: 5000,
                currency: 'EUR',
                status: 'pending' as BookingStatus,
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid status', () => {
            const bookingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                listingId: '223e4567-e89b-12d3-a456-426614174001',
                touristId: '323e4567-e89b-12d3-a456-426614174002',
                bookingDate: new Date('2026-02-15'),
                timeSlot: '09:00:00',
                quantity: 1,
                totalPrice: 5000,
                currency: 'LKR' as Currency,
                status: 'invalid-status',
                createdAt: new Date(),
            };

            const result = BookingSchema.safeParse(bookingData);
            expect(result.success).toBe(false);
        });
    });
});
