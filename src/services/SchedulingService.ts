import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/utils/supabase';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type ListingRow = Database['public']['Tables']['listings']['Row'];

export interface AvailabilityResult {
    available: boolean;
    remainingCapacity: number;
    conflictingBookings: BookingRow[];
}

export class SchedulingService {
    constructor(private supabase: SupabaseClient<Database>) { }

    /**
     * Check if a booking can be made for a given listing, date, and time slot
     */
    async checkAvailability(
        listingId: string,
        bookingDate: Date,
        timeSlot: string | null,
        requestedQuantity: number,
        listing?: Partial<ListingRow>
    ): Promise<AvailabilityResult> {
        // Fetch listing if not provided
        let listingData = listing;
        if (!listingData) {
            const { data, error } = await this.supabase
                .from('listings')
                .select('capacity')
                .eq('id', listingId)
                .single();

            if (error || !data) {
                throw new Error('Listing not found');
            }
            listingData = data;
        }

        const capacity = listingData.capacity || 0;

        // Get existing bookings for this slot
        const conflictingBookings = await this.detectConflicts(listingId, bookingDate, timeSlot);

        // Calculate remaining capacity
        const remainingCapacity = this.calculateRemainingCapacity(capacity, conflictingBookings);

        const available = remainingCapacity >= requestedQuantity;

        return {
            available,
            remainingCapacity,
            conflictingBookings,
        };
    }

    /**
     * Detect conflicting bookings for a specific listing, date, and time slot
     */
    async detectConflicts(
        listingId: string,
        bookingDate: Date,
        timeSlot: string | null
    ): Promise<BookingRow[]> {
        const dateString = bookingDate.toISOString().split('T')[0];

        let query = this.supabase
            .from('bookings')
            .select('*')
            .eq('listing_id', listingId)
            .eq('booking_date', dateString)
            .neq('status', 'cancelled');

        // Add time slot filter if provided
        if (timeSlot !== null) {
            query = query.eq('time_slot', timeSlot);
        } else {
            query = query.is('time_slot', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error detecting conflicts:', error);
            // If RLS blocks access, we might get an empty list which is DANGEROUS!
            // We should ideally throw if we suspect permission issues, but for now we log loud.
            if (error.code === '42501') { // Warning: Postgres RLS error code
                console.error('CRITICAL: RLS detected during availability check. Availability might be incorrect.');
                throw new Error('Permission denied checking availability');
            }
            return [];
        }

        return data || [];
    }

    /**
     * Calculate remaining capacity based on existing bookings
     */
    calculateRemainingCapacity(totalCapacity: number, existingBookings: BookingRow[]): number {
        const bookedQuantity = existingBookings.reduce((sum, booking) => sum + booking.quantity, 0);
        return totalCapacity - bookedQuantity;
    }

    /**
     * Create a new booking (with availability check)
     */
    async createBooking(
        listingId: string,
        touristId: string,
        bookingDate: Date,
        quantity: number,
        totalPrice: number,
        currency: 'LKR' | 'USD',
        timeSlot?: string | null
    ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
        // Check availability first
        const availability = await this.checkAvailability(
            listingId,
            bookingDate,
            timeSlot || null,
            quantity
        );

        if (!availability.available) {
            return {
                success: false,
                error: `Insufficient capacity. Only ${availability.remainingCapacity} slots remaining.`,
            };
        }

        // Create booking
        const dateString = bookingDate.toISOString().split('T')[0];

        const { data, error } = await this.supabase
            .from('bookings')
            .insert({
                listing_id: listingId,
                tourist_id: touristId,
                booking_date: dateString,
                time_slot: timeSlot || null,
                quantity,
                total_price: totalPrice,
                currency,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating booking:', error);
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: true,
            bookingId: data.id,
        };
    }
}
