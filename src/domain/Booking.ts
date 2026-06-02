import { z } from 'zod';

// Currency enum
export const Currency = {
    LKR: 'LKR',  // Sri Lankan Rupee
    USD: 'USD',  // US Dollar
} as const;

export type Currency = typeof Currency[keyof typeof Currency];

// Booking status enum
export const BookingStatus = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

// Booking schema with Zod validation
export const BookingSchema = z.object({
    id: z.string().uuid(),
    listingId: z.string().uuid(),
    touristId: z.string().uuid(),
    bookingDate: z.date(),
    timeSlot: z.string().nullable(), // NULL for date-based bookings
    quantity: z.number().int().positive(),
    totalPrice: z.number().positive(),
    currency: z.enum(['LKR', 'USD']),
    status: z.enum(['pending', 'confirmed', 'cancelled']),
    createdAt: z.date(),
});

// Type inference from schema
export type Booking = z.infer<typeof BookingSchema>;

// Helper function to create booking data
export const createBookingData = (
    listingId: string,
    touristId: string,
    bookingDate: Date,
    quantity: number,
    totalPrice: number,
    currency: Currency,
    timeSlot?: string | null
): Omit<Booking, 'id' | 'status' | 'createdAt'> => {
    return {
        listingId,
        touristId,
        bookingDate,
        timeSlot: timeSlot ?? null,
        quantity,
        totalPrice,
        currency,
    };
};
