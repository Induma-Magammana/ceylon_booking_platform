import { z } from 'zod';

// Review schema with Zod validation
export const ReviewSchema = z.object({
    id: z.string().uuid(),
    listingId: z.string().uuid(),
    userId: z.string().uuid(),
    bookingId: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Type inference from schema
export type Review = z.infer<typeof ReviewSchema>;

// Review with user details for display
export const ReviewWithUserSchema = ReviewSchema.extend({
    userFullName: z.string(),
    userEmail: z.string().email().optional(),
});

export type ReviewWithUser = z.infer<typeof ReviewWithUserSchema>;

// Listing rating summary
export const ListingRatingSummarySchema = z.object({
    listingId: z.string().uuid(),
    reviewCount: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    fiveStar: z.number().int().nonnegative(),
    fourStar: z.number().int().nonnegative(),
    threeStar: z.number().int().nonnegative(),
    twoStar: z.number().int().nonnegative(),
    oneStar: z.number().int().nonnegative(),
});

export type ListingRatingSummary = z.infer<typeof ListingRatingSummarySchema>;

// Helper function to validate review
export const validateReview = (reviewData: unknown): Review => {
    return ReviewSchema.parse(reviewData);
};

// Helper function to validate review creation input
export const CreateReviewSchema = ReviewSchema.omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
