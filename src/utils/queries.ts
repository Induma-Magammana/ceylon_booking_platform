import { query } from './database';
import { v4 as uuidv4 } from 'uuid';

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
        const id = uuidv4();
        await query(
            `INSERT INTO listings 
             (id, host_id, title, description, inventory_type, location, local_price, foreign_price, capacity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.hostId, data.title, data.description || null, data.inventoryType, 
             data.location, data.localPrice, data.foreignPrice, data.capacity]
        );
        return { id, ...data };
    },

    // READ - Get all listings with optional filters
    getAll: async (filters?: { location?: string; inventoryType?: string; hostId?: string }) => {
        let sql = 'SELECT * FROM listings WHERE 1=1';
        const params: any[] = [];

        if (filters?.location) {
            sql += ' AND location LIKE ?';
            params.push(`%${filters.location}%`);
        }
        if (filters?.inventoryType) {
            sql += ' AND inventory_type = ?';
            params.push(filters.inventoryType);
        }
        if (filters?.hostId) {
            sql += ' AND host_id = ?';
            params.push(filters.hostId);
        }

        const results: any = await query(sql, params);
        return results.map((row: any) => ({
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
        const results: any = await query(
            `SELECT l.*, u.id as host_id, u.full_name, u.email, u.contact_number
             FROM listings l
             LEFT JOIN users u ON l.host_id = u.id
             WHERE l.id = ?`,
            [id]
        );
        if (results.length === 0) return null;

        const row = results[0];
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
            host: {
                id: row.host_id,
                fullName: row.full_name,
                email: row.email,
                contactNumber: row.contact_number,
            },
            createdAt: row.created_at,
        };
    },

    // UPDATE
    update: async (id: string, updates: any) => {
        const fields: string[] = [];
        const values: any[] = [];

        Object.entries(updates).forEach(([key, value]) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`${dbKey} = ?`);
            values.push(value);
        });

        values.push(id);
        const sql = `UPDATE listings SET ${fields.join(', ')} WHERE id = ?`;
        
        await query(sql, values);
        return listingQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await query('DELETE FROM listings WHERE id = ?', [id]);
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
        const id = uuidv4();
        await query(
            `INSERT INTO bookings 
             (id, listing_id, tourist_id, booking_date, time_slot, quantity, total_price, currency, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [id, data.listingId, data.touristId, data.bookingDate, data.timeSlot || null, 
             data.quantity, data.totalPrice, data.currency]
        );
        return { id, ...data, status: 'pending' };
    },

    // READ - Get all bookings
    getAll: async (filters?: { listingId?: string; touristId?: string; status?: string }) => {
        let sql = 'SELECT * FROM bookings WHERE 1=1';
        const params: any[] = [];

        if (filters?.listingId) {
            sql += ' AND listing_id = ?';
            params.push(filters.listingId);
        }
        if (filters?.touristId) {
            sql += ' AND tourist_id = ?';
            params.push(filters.touristId);
        }
        if (filters?.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        sql += ' ORDER BY booking_date ASC';
        const results: any = await query(sql, params);
        return results;
    },

    // READ - Get single booking
    getById: async (id: string) => {
        const results: any = await query(
            `SELECT b.*, 
                    t.id as tourist_id, t.full_name as tourist_name, t.email as tourist_email, t.contact_number as tourist_contact,
                    l.id as listing_id, l.title as listing_title, l.location
             FROM bookings b
             LEFT JOIN users t ON b.tourist_id = t.id
             LEFT JOIN listings l ON b.listing_id = l.id
             WHERE b.id = ?`,
            [id]
        );
        if (results.length === 0) return null;

        const row = results[0];
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
            tourist: {
                id: row.tourist_id,
                fullName: row.tourist_name,
                email: row.tourist_email,
                contactNumber: row.tourist_contact,
            },
            listing: {
                id: row.listing_id,
                title: row.listing_title,
                location: row.location,
            },
            createdAt: row.created_at,
        };
    },

    // UPDATE - Update booking status
    updateStatus: async (id: string, status: string) => {
        await query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        return bookingQueries.getById(id);
    },

    // UPDATE - Update booking
    update: async (id: string, updates: any) => {
        const fields: string[] = [];
        const values: any[] = [];

        Object.entries(updates).forEach(([key, value]) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`${dbKey} = ?`);
            values.push(value);
        });

        values.push(id);
        const sql = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`;
        
        await query(sql, values);
        return bookingQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await query('DELETE FROM bookings WHERE id = ?', [id]);
    },

    // Check availability
    checkAvailability: async (listingId: string, bookingDate: Date, timeSlot: string | null, quantity: number) => {
        let sql = `SELECT SUM(quantity) as booked_quantity FROM bookings 
                   WHERE listing_id = ? AND booking_date = ? AND status != 'cancelled'`;
        const params: any[] = [listingId, bookingDate];

        if (timeSlot) {
            sql += ' AND time_slot = ?';
            params.push(timeSlot);
        }

        const results: any = await query(sql, params);
        const bookedQuantity = results[0]?.booked_quantity || 0;

        // Get listing capacity
        const listingResults: any = await query('SELECT capacity FROM listings WHERE id = ?', [listingId]);
        const capacity = listingResults[0]?.capacity || 0;

        return {
            available: bookedQuantity + quantity <= capacity,
            remainingCapacity: capacity - bookedQuantity,
        };
    },

    // Get bookings for listing with tourist info
    getByListing: async (listingId: string) => {
        const results: any = await query(
            `SELECT b.*, 
                    t.id as tourist_id, t.full_name as tourist_name, t.email as tourist_email, t.contact_number as tourist_contact,
                    l.id as listing_id, l.title as listing_title, l.location
             FROM bookings b
             LEFT JOIN users t ON b.tourist_id = t.id
             LEFT JOIN listings l ON b.listing_id = l.id
             WHERE b.listing_id = ?
             ORDER BY b.booking_date ASC`,
            [listingId]
        );

        return results.map((row: any) => ({
            id: row.id,
            listingId: row.listing_id,
            touristId: row.tourist_id,
            bookingDate: row.booking_date,
            timeSlot: row.time_slot,
            quantity: row.quantity,
            totalPrice: row.total_price,
            currency: row.currency,
            status: row.status,
            tourist: {
                id: row.tourist_id,
                fullName: row.tourist_name,
                email: row.tourist_email,
                contactNumber: row.tourist_contact,
            },
            listing: {
                id: row.listing_id,
                title: row.listing_title,
                location: row.location,
            },
            createdAt: row.created_at,
        }));
    },

    // Get bookings for tourist with listing info
    getByTourist: async (touristId: string) => {
        const results: any = await query(
            `SELECT b.*, 
                    l.id as listing_id, l.title as listing_title, l.location, l.local_price, l.foreign_price
             FROM bookings b
             LEFT JOIN listings l ON b.listing_id = l.id
             WHERE b.tourist_id = ?
             ORDER BY b.booking_date DESC`,
            [touristId]
        );

        return results.map((row: any) => ({
            id: row.id,
            listingId: row.listing_id,
            touristId: row.tourist_id,
            bookingDate: row.booking_date,
            timeSlot: row.time_slot,
            quantity: row.quantity,
            totalPrice: row.total_price,
            currency: row.currency,
            status: row.status,
            listing: {
                id: row.listing_id,
                title: row.listing_title,
                location: row.location,
                localPrice: row.local_price,
                foreignPrice: row.foreign_price,
            },
            createdAt: row.created_at,
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
        const id = uuidv4();
        await query(
            `INSERT INTO reviews 
             (id, listing_id, user_id, booking_id, rating, comment)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, data.listingId, data.userId, data.bookingId || null, data.rating, data.comment || null]
        );
        return { id, ...data };
    },

    // READ - Get reviews for listing
    getByListing: async (listingId: string, limit: number = 10, offset: number = 0) => {
        const results: any = await query(
            `SELECT r.*, u.id as user_id, u.full_name, u.email
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.listing_id = ?
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?`,
            [listingId, limit, offset]
        );

        return results.map((row: any) => ({
            id: row.id,
            listingId: row.listing_id,
            userId: row.user_id,
            bookingId: row.booking_id,
            rating: row.rating,
            comment: row.comment,
            user: {
                id: row.user_id,
                fullName: row.full_name,
                email: row.email,
            },
            createdAt: row.created_at,
        }));
    },

    // READ - Get all reviews
    getAll: async (filters?: { userId?: string }, limit: number = 20, offset: number = 0) => {
        let sql = `SELECT r.*, u.id as user_id, u.full_name, l.id as listing_id, l.title, l.location
                   FROM reviews r
                   LEFT JOIN users u ON r.user_id = u.id
                   LEFT JOIN listings l ON r.listing_id = l.id
                   WHERE 1=1`;
        const params: any[] = [];

        if (filters?.userId) {
            sql += ' AND r.user_id = ?';
            params.push(filters.userId);
        }

        sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results: any = await query(sql, params);
        return results.map((row: any) => ({
            id: row.id,
            listingId: row.listing_id,
            userId: row.user_id,
            rating: row.rating,
            comment: row.comment,
            user: {
                id: row.user_id,
                fullName: row.full_name,
            },
            listing: {
                id: row.listing_id,
                title: row.title,
                location: row.location,
            },
            createdAt: row.created_at,
        }));
    },

    // READ - Get single review
    getById: async (id: string) => {
        const results: any = await query(
            `SELECT r.*, u.id as user_id, u.full_name
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.id = ?`,
            [id]
        );
        if (results.length === 0) return null;

        const row = results[0];
        return {
            id: row.id,
            listingId: row.listing_id,
            userId: row.user_id,
            bookingId: row.booking_id,
            rating: row.rating,
            comment: row.comment,
            user: {
                id: row.user_id,
                fullName: row.full_name,
            },
            createdAt: row.created_at,
        };
    },

    // UPDATE
    update: async (id: string, rating: number, comment?: string) => {
        await query(
            'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
            [rating, comment || null, id]
        );
        return reviewQueries.getById(id);
    },

    // DELETE
    delete: async (id: string) => {
        await query('DELETE FROM reviews WHERE id = ?', [id]);
    },

    // Get rating summary for listing
    getRatingSummary: async (listingId: string) => {
        const results: any = await query(
            `SELECT 
                COUNT(*) as review_count,
                AVG(rating) as average_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
             FROM reviews
             WHERE listing_id = ?`,
            [listingId]
        );

        const row = results[0];
        return {
            listingId,
            reviewCount: row.review_count || 0,
            averageRating: row.average_rating || 0,
            fiveStar: row.five_star || 0,
            fourStar: row.four_star || 0,
            threeStar: row.three_star || 0,
            twoStar: row.two_star || 0,
            oneStar: row.one_star || 0,
        };
    },
};
