import { Listing } from '@/domain/Listing';
import { User } from '@/domain/User';
import { Currency } from '@/domain/Booking';

export interface PriceResult {
    totalPrice: number;
    unitPrice: number;
    currency: Currency;
}

export class PricingService {
    /**
     * Calculate price based on user origin and listing rates
     */
    calculatePrice(listing: Listing, user: User, quantity: number): PriceResult {
        const isLocal = user.country === 'LK';

        if (isLocal) {
            return {
                unitPrice: listing.localPrice,
                totalPrice: listing.localPrice * quantity,
                currency: Currency.LKR,
            };
        }

        return {
            unitPrice: listing.foreignPrice,
            totalPrice: listing.foreignPrice * quantity,
            currency: Currency.USD,
        };
    }
}
