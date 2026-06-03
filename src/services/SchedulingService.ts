import { bookingQueries } from '@/utils/queries';
import { listingQueries } from '@/utils/queries';

export interface AvailabilityResult {
    available: boolean;
    remainingCapacity: number;
    conflictingBookings: any[];
}

export class SchedulingService {
    constructor() {}

    async checkAvailability(
        listingId: string,
        bookingDate: Date,
        timeSlot: string | null,
        requestedQuantity: number,
        listing?: any
    ): Promise<AvailabilityResult> {
        let listingData = listing;
        if (!listingData) {
            listingData = await listingQueries.getById(listingId);
            if (!listingData) throw new Error('Listing not found');
        }

        const capacity = listingData.capacity || 0;
        const conflicts = await bookingQueries.getAll({ listingId });
        // Filter by date and timeSlot
        const dateOnly = (d: Date) => new Date(d).toISOString().split('T')[0];
        const conflictingBookings = conflicts.filter((b: any) => {
            const sameDate = dateOnly(new Date(b.booking_date)) === dateOnly(bookingDate);
            const sameSlot = timeSlot ? b.time_slot === timeSlot : (b.time_slot === null || b.time_slot === undefined);
            const notCancelled = b.status !== 'cancelled';
            return sameDate && sameSlot && notCancelled;
        });

        const bookedQuantity = conflictingBookings.reduce((s: number, bk: any) => s + (bk.quantity || 0), 0);
        const remainingCapacity = capacity - bookedQuantity;
        const available = remainingCapacity >= requestedQuantity;

        return { available, remainingCapacity, conflictingBookings };
    }

    async createBooking(
        listingId: string,
        touristId: string,
        bookingDate: Date,
        quantity: number,
        totalPrice: number,
        currency: 'LKR' | 'USD',
        timeSlot?: string | null
    ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
        const availability = await this.checkAvailability(listingId, bookingDate, timeSlot || null, quantity);
        if (!availability.available) {
            return { success: false, error: `Insufficient capacity. Only ${availability.remainingCapacity} slots remaining.` };
        }

        const created = await bookingQueries.create({
            listingId,
            touristId,
            bookingDate,
            timeSlot: timeSlot || null,
            quantity,
            totalPrice,
            currency,
        });

        return { success: true, bookingId: created.id };
    }
}
