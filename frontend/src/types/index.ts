// API Types matching backend

export interface User {
    id: string;
    email: string;
    fullName: string;
    userType: 'tourist' | 'host';
    country?: string;
    contactNumber?: string;
    createdAt: string;
}

export interface Listing {
    id: string;
    hostId: string;
    title: string;
    description?: string;
    inventoryType: 'slot' | 'date';
    location: string;
    localPrice: number;
    foreignPrice: number;
    capacity: number;
    createdAt: string;
    isAvailable?: boolean;
    coverImage?: string;
    socialMediaInstagram?: string;
    socialMediaFacebook?: string;
    host?: {
        id: string;
        full_name: string;
        fullName?: string;
        email: string;
        contact_number?: string;
        contactNumber?: string;
    };
}

export interface Booking {
    id: string;
    listingId: string;
    touristId: string;
    bookingDate: string;
    timeSlot?: string;
    quantity: number;
    totalPrice: number;
    currency: 'LKR' | 'USD';
    status: 'pending' | 'confirmed' | 'cancelled' | 'accepted' | 'not_paid' | 'paid' | 'completed';
    createdAt: string;
    listing?: Listing;
    tourist?: {
        id: string;
        full_name: string;
        fullName?: string;
        email: string;
        contact_number?: string;
        contactNumber?: string;
    };
}

export interface Review {
    id: string;
    listingId: string;
    userId: string;
    bookingId?: string;
    rating: number;
    comment?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        full_name: string;
        email?: string;
    };
    listing?: {
        id: string;
        title: string;
        location: string;
    };
}

export interface ListingRatingSummary {
    listingId: string;
    reviewCount: number;
    averageRating: number;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        user: {
            id: string;
            email: string;
        };
        session: {
            access_token: string;
            refresh_token: string;
        };
    };
    error?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
