import { describe, it, expect } from 'vitest';
import { PricingService } from '@/services/PricingService';
import { Listing } from '@/domain/Listing';
import { User } from '@/domain/User';

describe('PricingService', () => {
    const service = new PricingService();

    const mockListing: Listing = {
        id: 'listing-1',
        hostId: 'host-1',
        title: 'Test Listing',
        inventoryType: 'slot',
        location: 'Colombo',
        localPrice: 5000,   // LKR
        foreignPrice: 50,   // USD
        capacity: 10,
        createdAt: new Date(),
    };

    describe('calculatePrice', () => {
        it('should charge local price in LKR for users from LK', () => {
            const localUser: User = {
                id: 'user-1',
                email: 'local@example.com',
                userType: 'tourist',
                fullName: 'Kamal Perera',
                country: 'LK',
                createdAt: new Date(),
            };

            const result = service.calculatePrice(mockListing, localUser, 2);

            expect(result.currency).toBe('LKR');
            expect(result.totalPrice).toBe(10000); // 5000 * 2
            expect(result.unitPrice).toBe(5000);
        });

        it('should charge foreign price in USD for users from other countries', () => {
            const foreignUser: User = {
                id: 'user-2',
                email: 'john@example.com',
                userType: 'tourist',
                fullName: 'John Doe',
                country: 'US',
                createdAt: new Date(),
            };

            const result = service.calculatePrice(mockListing, foreignUser, 3);

            expect(result.currency).toBe('USD');
            expect(result.totalPrice).toBe(150); // 50 * 3
            expect(result.unitPrice).toBe(50);
        });

        it('should default to USD if country is missing', () => {
            const unknownUser: User = {
                id: 'user-3',
                email: 'anon@example.com',
                userType: 'tourist',
                fullName: 'Unknown',
                createdAt: new Date(),
            };

            const result = service.calculatePrice(mockListing, unknownUser, 1);

            expect(result.currency).toBe('USD');
            expect(result.totalPrice).toBe(50);
        });
    });
});
