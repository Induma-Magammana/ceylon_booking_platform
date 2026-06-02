import { describe, it, expect } from 'vitest';
import { Listing, ListingSchema, InventoryType } from '@/domain/Listing';

describe('Listing Domain Model', () => {
    describe('Listing Creation', () => {
        it('should create a valid slot-based listing', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Whale Watching Tour',
                description: 'Amazing whale watching experience',
                inventoryType: 'slot' as InventoryType,
                location: 'Mirissa',
                localPrice: 5000,
                foreignPrice: 50,
                capacity: 20,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventoryType).toBe('slot');
            }
        });

        it('should create a valid date-based listing (homestay)', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Cozy Beach Homestay',
                description: 'Beautiful beachfront property',
                inventoryType: 'date' as InventoryType,
                location: 'Galle',
                localPrice: 8000,
                foreignPrice: 80,
                capacity: 4,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventoryType).toBe('date');
            }
        });

        it('should reject negative local price', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Test Listing',
                description: 'Test description',
                inventoryType: 'slot' as InventoryType,
                location: 'Colombo',
                localPrice: -100,
                foreignPrice: 50,
                capacity: 10,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(false);
        });

        it('should reject negative foreign price', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Test Listing',
                description: 'Test description',
                inventoryType: 'slot' as InventoryType,
                location: 'Colombo',
                localPrice: 100,
                foreignPrice: -50,
                capacity: 10,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(false);
        });

        it('should reject zero or negative capacity', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Test Listing',
                description: 'Test description',
                inventoryType: 'slot' as InventoryType,
                location: 'Colombo',
                localPrice: 100,
                foreignPrice: 50,
                capacity: 0,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(false);
        });

        it('should reject empty title', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: '',
                description: 'Test description',
                inventoryType: 'slot' as InventoryType,
                location: 'Colombo',
                localPrice: 100,
                foreignPrice: 50,
                capacity: 10,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid inventory type', () => {
            const listingData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                hostId: '223e4567-e89b-12d3-a456-426614174001',
                title: 'Test Listing',
                description: 'Test description',
                inventoryType: 'invalid',
                location: 'Colombo',
                localPrice: 100,
                foreignPrice: 50,
                capacity: 10,
                createdAt: new Date(),
            };

            const result = ListingSchema.safeParse(listingData);
            expect(result.success).toBe(false);
        });
    });
});
