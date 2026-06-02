import type { AuthResponse, ApiResponse, Listing, Booking, Review, ListingRatingSummary } from '../types';

const API_BASE = '/api';

// Helper to get auth headers
const getHeaders = (token?: string | null): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Auth API
export const authApi = {
    signup: async (data: {
        email: string;
        password: string;
        fullName: string;
        userType: 'tourist' | 'host';
    }): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    updateProfile: async (
        data: { fullName: string; country?: string; email?: string; currentPassword?: string; newPassword?: string; contactNumber?: string },
        token: string
    ): Promise<ApiResponse<any>> => {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        return res.json();
    },
};

// Helper to map snake_case API response to camelCase
const mapListing = (item: any): Listing => ({
    id: item.id,
    hostId: item.host_id || item.hostId,
    title: item.title,
    description: item.description,
    inventoryType: item.inventory_type || item.inventoryType,
    location: item.location,
    localPrice: item.local_price ?? item.localPrice ?? 0,
    foreignPrice: item.foreign_price ?? item.foreignPrice ?? 0,
    capacity: item.capacity,
    createdAt: item.created_at || item.createdAt,
    isAvailable: item.is_available ?? item.isAvailable ?? true,
    coverImage: item.cover_image || item.coverImage,
    socialMediaInstagram: item.social_media_instagram || item.socialMediaInstagram,
    socialMediaFacebook: item.social_media_facebook || item.socialMediaFacebook,
    host: item.host ? {
        id: item.host.id,
        full_name: item.host.full_name,
        fullName: item.host.full_name,
        email: item.host.email,
        contact_number: item.host.contact_number,
        contactNumber: item.host.contact_number,
    } : undefined,
});

// Listings API
export const listingsApi = {
    getAll: async (filters?: { location?: string; inventoryType?: string }): Promise<ApiResponse<Listing[]>> => {
        const params = new URLSearchParams();
        if (filters?.location) params.set('location', filters.location);
        if (filters?.inventoryType) params.set('inventoryType', filters.inventoryType);

        const res = await fetch(`${API_BASE}/listings?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapListing),
            };
        }
        return json;
    },

    getById: async (id: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings/${id}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapListing(json.data),
            };
        }
        return json;
    },

    create: async (data: Partial<Listing>, token: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    update: async (id: string, data: Partial<Listing>, token: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings/${id}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        
        if (json.success && json.data) {
            return {
                success: true,
                data: mapListing(json.data),
            };
        }
        return json;
    },

    updateAvailability: async (id: string, isAvailable: boolean, token: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings/${id}/availability`, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify({ isAvailable }),
        });
        const json = await res.json();
        
        if (json.success && json.data) {
            return {
                success: true,
                data: mapListing(json.data),
            };
        }
        return json;
    },
};

// Helper to map snake_case Booking to camelCase
const mapBooking = (item: any): Booking => ({
    id: item.id,
    listingId: item.listing_id || item.listingId,
    touristId: item.tourist_id || item.touristId,
    bookingDate: item.booking_date || item.bookingDate,
    timeSlot: item.time_slot || item.timeSlot,
    quantity: item.quantity,
    totalPrice: item.total_price ?? item.totalPrice ?? 0,
    currency: item.currency,
    status: item.status,
    createdAt: item.created_at || item.createdAt,
    listing: item.listing ? mapListing(item.listing) : undefined,
});

// Bookings API
export const bookingsApi = {
    checkAvailability: async (data: {
        listingId: string;
        bookingDate: string;
        timeSlot?: string;
        quantity: number;
    }): Promise<ApiResponse<{ available: boolean; remainingCapacity: number }>> => {
        const res = await fetch(`${API_BASE}/bookings/check-availability`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    create: async (
        data: {
            listingId: string;
            bookingDate: string;
            timeSlot?: string;
            quantity: number;
        },
        token: string
    ): Promise<ApiResponse<{ bookingId: string }>> => {
        const res = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getById: async (id: string, token: string): Promise<ApiResponse<Booking>> => {
        const res = await fetch(`${API_BASE}/bookings/${id}`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapBooking(json.data),
            };
        }
        return json;
    },

    getByTourist: async (touristId: string, token: string): Promise<ApiResponse<Booking[]>> => {
        const res = await fetch(`${API_BASE}/tourists/${touristId}/bookings`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapBooking),
            };
        }
        return json;
    },

    getByListing: async (listingId: string, token: string): Promise<ApiResponse<Booking[]>> => {
        const res = await fetch(`${API_BASE}/listings/${listingId}/bookings`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapBooking),
            };
        }
        return json;
    },

    updateStatus: async (bookingId: string, status: string, token: string): Promise<ApiResponse<Booking>> => {
        const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify({ status }),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapBooking(json.data),
            };
        }
        return json;
    },
};

// Helper to map snake_case Review to camelCase
const mapReview = (item: any): Review => ({
    id: item.id,
    listingId: item.listing_id || item.listingId,
    userId: item.user_id || item.userId,
    bookingId: item.booking_id || item.bookingId,
    rating: item.rating,
    comment: item.comment,
    createdAt: item.created_at || item.createdAt,
    updatedAt: item.updated_at || item.updatedAt,
    user: item.user,
    listing: item.listing ? mapListing(item.listing) : undefined,
});

// Reviews API
export const reviewsApi = {
    // Get all reviews with optional filters
    getAll: async (filters?: { userId?: string; limit?: number; offset?: number }): Promise<ApiResponse<Review[]>> => {
        const params = new URLSearchParams();
        if (filters?.userId) params.set('userId', filters.userId);
        if (filters?.limit) params.set('limit', filters.limit.toString());
        if (filters?.offset) params.set('offset', filters.offset.toString());

        const res = await fetch(`${API_BASE}/reviews?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapReview),
            };
        }
        return json;
    },

    // Get reviews for a specific listing
    getByListing: async (listingId: string, limit?: number, offset?: number): Promise<ApiResponse<Review[]>> => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', limit.toString());
        if (offset) params.set('offset', offset.toString());

        const res = await fetch(`${API_BASE}/listings/${listingId}/reviews?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapReview),
            };
        }
        return json;
    },

    // Get rating summary for a listing
    getRatingSummary: async (listingId: string): Promise<ApiResponse<ListingRatingSummary>> => {
        const res = await fetch(`${API_BASE}/listings/${listingId}/rating-summary`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: {
                    listingId: json.data.listing_id || json.data.listingId,
                    reviewCount: json.data.review_count || json.data.reviewCount,
                    averageRating: json.data.average_rating || json.data.averageRating,
                    fiveStar: json.data.five_star || json.data.fiveStar,
                    fourStar: json.data.four_star || json.data.fourStar,
                    threeStar: json.data.three_star || json.data.threeStar,
                    twoStar: json.data.two_star || json.data.twoStar,
                    oneStar: json.data.one_star || json.data.oneStar,
                },
            };
        }
        return json;
    },

    // Create a new review
    create: async (
        data: {
            listingId: string;
            userId: string;
            bookingId?: string;
            rating: number;
            comment?: string;
        },
        token: string
    ): Promise<ApiResponse<Review>> => {
        const res = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapReview(json.data),
            };
        }
        return json;
    },

    // Update a review
    update: async (
        id: string,
        data: { rating: number; comment?: string },
        token: string
    ): Promise<ApiResponse<Review>> => {
        const res = await fetch(`${API_BASE}/reviews/${id}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapReview(json.data),
            };
        }
        return json;
    },

    // Delete a review
    delete: async (id: string, token: string): Promise<ApiResponse<void>> => {
        const res = await fetch(`${API_BASE}/reviews/${id}`, {
            method: 'DELETE',
            headers: getHeaders(token),
        });
        return res.json();
    },
};
