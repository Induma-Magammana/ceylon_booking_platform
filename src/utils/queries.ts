import { getDb, connectDB } from './database';
import { v4 as uuidv4 } from 'uuid';

const ensureDb = async () => {
    try {
        getDb();
    } catch (e) {
        await connectDB();
    }
};

// ==================== LISTINGS QUERIES ====================

export const listingQueries = {
    // CREATE
    create: async (data: {
        hostId: string;
        title: string;
        description?: string;
        inventoryType: 'slot' | 'date';
        location: string;
        localPrice: number;
        foreignPrice: number;
        capacity: number;
    }) => {
        await ensureDb();
        const id = uuidv4();
        const listings = getDb().collection('listings');
        const doc = {
            id,
            host_id: data.hostId,
            title: data.title,
            description: data.description || null,
            inventory_type: data.inventoryType,
            location: data.location,
            local_price: data.localPrice,
            foreign_price: data.foreignPrice,
            capacity: data.capacity,
            cover_image: null,
            social_media_instagram: null,
            social_media_facebook: null,
            is_available: true,
            created_at: new Date(),
            updated_at: new Date(),
        };
        await listings.insertOne(doc);
        return { id, ...data };
    },

    // READ - Get all listings with optional filters
    getAll: async (filters?: { location?: string; inventoryType?: string; hostId?: string }) => {
        await ensureDb();
        const listings = getDb().collection('listings');
        const q: any = {};
        if (filters?.location) q.location = { $regex: filters.location, $options: 'i' };
        if (filters?.inventoryType) q.inventory_type = filters.inventoryType;
        if (filters?.hostId) q.host_id = filters.hostId;

        const cursor = listings.find(q);
        const rows = await cursor.toArray();
        return rows.map((row: any) => ({
            id: row.id,
            hostId: row.host_id,
            title: row.title,
            description: row.description,
            inventoryType: row.inventory_type,
            location: row.location,
            localPrice: row.local_price,
            foreignPrice: row.foreign_price,
            capacity: row.capacity,
            coverImage: row.cover_image,
            socialMediaInstagram: row.social_media_instagram,
            socialMediaFacebook: row.social_media_facebook,
            isAvailable: row.is_available,
            createdAt: row.created_at,
        }));
    },

    // READ - Get single listing with host details
    getById: async (id: string) => {
        await ensureDb();
        const listings = getDb().collection('listings');
        const users = getDb().collection('users');
        const row = await listings.findOne({ id });
        if (!row) return null;
        const host = await users.findOne({ id: row.host_id });
        return {
            id: row.id,
            hostId: row.host_id,
            title: row.title,
            description: row.description,
            inventoryType: row.inventory_type,
            location: row.location,
            localPrice: row.local_price,
            foreignPrice: row.foreign_price,
            capacity: row.capacity,
            coverImage: row.cover_image,
            socialMediaInstagram: row.social_media_instagram,
            socialMediaFacebook: row.social_media_facebook,
            isAvailable: row.is_available,
            host: host ? {
                id: host.id,
                fullName: host.full_name,
                email: host.email,
                contactNumber: host.contact_number,
            } : null,
            createdAt: row.created_at,
        };
    },

    // UPDATE
    update: async (id: string, updates: any) => {
        await ensureDb();
        const listings = getDb().collection('listings');
        const set: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            set[dbKey] = value;
        });
        set.updated_at = new Date();
        await listings.updateOne({ id }, { $set: set });
        return listingQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await ensureDb();
        const listings = getDb().collection('listings');
        await listings.deleteOne({ id });
    },

    // Get listings by host
    getByHost: async (hostId: string) => {
        return listingQueries.getAll({ hostId });
    },
};

// ==================== BOOKINGS QUERIES ====================

export const bookingQueries = {
    // CREATE
    create: async (data: {
        listingId: string;
        touristId: string;
        bookingDate: Date;
        timeSlot: string | null;
        quantity: number;
        totalPrice: number;
        currency: 'LKR' | 'USD';
    }) => {
        await ensureDb();
        const id = uuidv4();
        const bookings = getDb().collection('bookings');
        const doc = {
            id,
            listing_id: data.listingId,
            tourist_id: data.touristId,
            booking_date: data.bookingDate,
            time_slot: data.timeSlot || null,
            quantity: data.quantity,
            total_price: data.totalPrice,
            currency: data.currency,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
        };
        await bookings.insertOne(doc);
        return { id, ...data, status: 'pending' };
    },

    // READ - Get all bookings
    getAll: async (filters?: { listingId?: string; touristId?: string; status?: string }) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const q: any = {};
        if (filters?.listingId) q.listing_id = filters.listingId;
        if (filters?.touristId) q.tourist_id = filters.touristId;
        if (filters?.status) q.status = filters.status;
        const rows = await bookings.find(q).sort({ booking_date: 1 }).toArray();
        return rows;
    },

    // READ - Get single booking
    getById: async (id: string) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const users = getDb().collection('users');
        const listings = getDb().collection('listings');
        const row = await bookings.findOne({ id });
        if (!row) return null;
        const tourist = await users.findOne({ id: row.tourist_id });
        const listing = await listings.findOne({ id: row.listing_id });
        return {
            id: row.id,
            listingId: row.listing_id,
            touristId: row.tourist_id,
            bookingDate: row.booking_date,
            timeSlot: row.time_slot,
            quantity: row.quantity,
            totalPrice: row.total_price,
            currency: row.currency,
            status: row.status,
            tourist: tourist ? {
                id: tourist.id,
                fullName: tourist.full_name,
                email: tourist.email,
                contactNumber: tourist.contact_number,
            } : null,
            listing: listing ? {
                id: listing.id,
                title: listing.title,
                location: listing.location,
            } : null,
            createdAt: row.created_at,
        };
    },

    // UPDATE - Update booking status
    updateStatus: async (id: string, status: string) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        await bookings.updateOne({ id }, { $set: { status, updated_at: new Date() } });
        return bookingQueries.getById(id);
    },

    // UPDATE - Update booking
    update: async (id: string, updates: any) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const set: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            set[dbKey] = value;
        });
        set.updated_at = new Date();
        await bookings.updateOne({ id }, { $set: set });
        return bookingQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        await bookings.deleteOne({ id });
    },

    // Check availability
    checkAvailability: async (listingId: string, bookingDate: Date, timeSlot: string | null, quantity: number) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const match: any = { listing_id: listingId, booking_date: bookingDate, status: { $ne: 'cancelled' } };
        if (timeSlot) match.time_slot = timeSlot;
        const agg = await bookings.aggregate([
            { $match: match },
            { $group: { _id: null, booked_quantity: { $sum: '$quantity' } } }
        ]).toArray();
        const bookedQuantity = agg[0]?.booked_quantity || 0;

        const listings = getDb().collection('listings');
        const listing = await listings.findOne({ id: listingId });
        const capacity = listing?.capacity || 0;

        return {
            available: bookedQuantity + quantity <= capacity,
            remainingCapacity: capacity - bookedQuantity,
        };
    },

    // Get bookings for listing with tourist info
    getByListing: async (listingId: string) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const users = getDb().collection('users');
        const listings = getDb().collection('listings');
        const rows = await bookings.find({ listing_id: listingId }).sort({ booking_date: 1 }).toArray();
        return Promise.all(rows.map(async (row: any) => {
            const tourist = await users.findOne({ id: row.tourist_id });
            const listing = await listings.findOne({ id: row.listing_id });
            return {
                id: row.id,
                listingId: row.listing_id,
                touristId: row.tourist_id,
                bookingDate: row.booking_date,
                timeSlot: row.time_slot,
                quantity: row.quantity,
                totalPrice: row.total_price,
                currency: row.currency,
                status: row.status,
                tourist: tourist ? {
                    id: tourist.id,
                    fullName: tourist.full_name,
                    email: tourist.email,
                    contactNumber: tourist.contact_number,
                } : null,
                listing: listing ? {
                    id: listing.id,
                    title: listing.title,
                    location: listing.location,
                } : null,
                createdAt: row.created_at,
            };
        }));
    },

    // Get bookings for tourist with listing info
    getByTourist: async (touristId: string) => {
        await ensureDb();
        const bookings = getDb().collection('bookings');
        const listings = getDb().collection('listings');
        const rows = await bookings.find({ tourist_id: touristId }).sort({ booking_date: -1 }).toArray();
        return Promise.all(rows.map(async (row: any) => {
            const listing = await listings.findOne({ id: row.listing_id });
            return {
                id: row.id,
                listingId: row.listing_id,
                touristId: row.tourist_id,
                bookingDate: row.booking_date,
                timeSlot: row.time_slot,
                quantity: row.quantity,
                totalPrice: row.total_price,
                currency: row.currency,
                status: row.status,
                listing: listing ? {
                    id: listing.id,
                    title: listing.title,
                    location: listing.location,
                    localPrice: listing.local_price,
                    foreignPrice: listing.foreign_price,
                } : null,
                createdAt: row.created_at,
            };
        }));
    },
};

// ==================== REVIEWS QUERIES ====================

export const reviewQueries = {
    // CREATE
    create: async (data: {
        listingId: string;
        userId: string;
        bookingId?: string;
        rating: number;
        comment?: string;
    }) => {
        await ensureDb();
        const id = uuidv4();
        const reviews = getDb().collection('reviews');
        const doc = {
            id,
            listing_id: data.listingId,
            user_id: data.userId,
            booking_id: data.bookingId || null,
            rating: data.rating,
            comment: data.comment || null,
            created_at: new Date(),
            updated_at: new Date(),
        };
        await reviews.insertOne(doc);
        return { id, ...data };
    },

    // READ - Get reviews for listing
    getByListing: async (listingId: string, limit: number = 10, offset: number = 0) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        const users = getDb().collection('users');
        const rows = await reviews.find({ listing_id: listingId }).sort({ created_at: -1 }).skip(offset).limit(limit).toArray();
        return Promise.all(rows.map(async (row: any) => {
            const user = await users.findOne({ id: row.user_id });
            return {
                id: row.id,
                listingId: row.listing_id,
                userId: row.user_id,
                bookingId: row.booking_id,
                rating: row.rating,
                comment: row.comment,
                user: user ? { id: user.id, fullName: user.full_name, email: user.email } : null,
                createdAt: row.created_at,
            };
        }));
    },

    // READ - Get all reviews
    getAll: async (filters?: { userId?: string }, limit: number = 20, offset: number = 0) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        const users = getDb().collection('users');
        const listings = getDb().collection('listings');
        const q: any = {};
        if (filters?.userId) q.user_id = filters.userId;
        const rows = await reviews.find(q).sort({ created_at: -1 }).skip(offset).limit(limit).toArray();
        return Promise.all(rows.map(async (row: any) => {
            const user = await users.findOne({ id: row.user_id });
            const listing = await listings.findOne({ id: row.listing_id });
            return {
                id: row.id,
                listingId: row.listing_id,
                userId: row.user_id,
                rating: row.rating,
                comment: row.comment,
                user: user ? { id: user.id, fullName: user.full_name } : null,
                listing: listing ? { id: listing.id, title: listing.title, location: listing.location } : null,
                createdAt: row.created_at,
            };
        }));
    },

    // READ - Get single review
    getById: async (id: string) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        const users = getDb().collection('users');
        const row = await reviews.findOne({ id });
        if (!row) return null;
        const user = await users.findOne({ id: row.user_id });
        return {
            id: row.id,
            listingId: row.listing_id,
            userId: row.user_id,
            bookingId: row.booking_id,
            rating: row.rating,
            comment: row.comment,
            user: user ? { id: user.id, fullName: user.full_name } : null,
            createdAt: row.created_at,
        };
    },

    // UPDATE
    update: async (id: string, rating: number, comment?: string) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        await reviews.updateOne({ id }, { $set: { rating, comment: comment || null, updated_at: new Date() } });
        return reviewQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        await reviews.deleteOne({ id });
    },

    // Get rating summary for listing
    getRatingSummary: async (listingId: string) => {
        await ensureDb();
        const reviews = getDb().collection('reviews');
        const agg = await reviews.aggregate([
            { $match: { listing_id: listingId } },
            { $group: {
                _id: '$listing_id',
                review_count: { $sum: 1 },
                average_rating: { $avg: '$rating' },
                five_star: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                four_star: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                three_star: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                two_star: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                one_star: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            } },
        ]).toArray();
        const row = agg[0];
        return {
            listingId,
            reviewCount: row?.review_count || 0,
            averageRating: row?.average_rating || 0,
            fiveStar: row?.five_star || 0,
            fourStar: row?.four_star || 0,
            threeStar: row?.three_star || 0,
            twoStar: row?.two_star || 0,
            oneStar: row?.one_star || 0,
        };
    },
};
