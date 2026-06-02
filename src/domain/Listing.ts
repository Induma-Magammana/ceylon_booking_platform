import { z } from 'zod';

// Inventory type enum
export const InventoryType = {
    SLOT: 'slot',    // Time-based (e.g., boat tours, activities)
    DATE: 'date',    // Night-based (e.g., homestays, hotels)
} as const;

export type InventoryType = typeof InventoryType[keyof typeof InventoryType];

// Listing schema with Zod validation
export const ListingSchema = z.object({
    id: z.string().uuid(),
    hostId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    inventoryType: z.enum(['slot', 'date']),
    location: z.string().min(1),
    localPrice: z.number().positive(),
    foreignPrice: z.number().positive(),
    capacity: z.number().int().positive(),
    createdAt: z.date(),
});

// Type inference from schema
export type Listing = z.infer<typeof ListingSchema>;

// Helper function to validate listing
export const validateListing = (listingData: unknown): Listing => {
    return ListingSchema.parse(listingData);
};
