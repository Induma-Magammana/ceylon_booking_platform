import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { authMiddleware } from '@/middleware/auth';
import { authRouter } from '@/api/auth';
import { initializeDatabase } from '@/utils/database';
import { getUserById } from '@/utils/auth';
import { SchedulingService } from '@/services/SchedulingService';
import { listingQueries, bookingQueries, reviewQueries } from '@/utils/queries';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = new Hono();

// Enable CORS
app.use('*', cors({
    origin: ['http://localhost:5175', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize database on startup
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Scheduling service (uses MongoDB-backed queries)
const schedulingService = new SchedulingService();

// Health check endpoint
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Auth Routes
app.route('/api/auth', authRouter);

// ===== IMAGE UPLOAD ENDPOINT =====

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'listings');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload listing image (stored locally)
app.post('/api/upload/listing-image', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        
        // Get the file from form data
        const formData = await c.req.formData();
        const file = formData.get('image') as File;
        
        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, 400);
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return c.json({ error: 'File size exceeds 5MB limit' }, 400);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${timestamp}.${fileExt}`;
        const filePath = path.join(uploadsDir, fileName);

        // Save file to disk
        const buffer = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        // Return file path and URL
        const publicUrl = `/uploads/listings/${fileName}`;

        return c.json({ 
            success: true, 
            data: { 
                path: publicUrl,
                url: publicUrl
            } 
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return c.json({ error: error.message || 'Failed to upload image' }, 500);
    }
});

// ===== LISTINGS ENDPOINTS =====

// Create a new listing
app.post('/api/listings', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const user = c.get('user');

        // Validate the listing data
        const { title, description, inventoryType, location, localPrice, foreignPrice, capacity } = body;
        
        if (!title || !inventoryType || !location || localPrice === undefined || foreignPrice === undefined || !capacity) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // Ensure user is creating listing for themselves
        const data = await listingQueries.create({
            hostId: user.id,
            title,
            description,
            inventoryType,
            location,
            localPrice,
            foreignPrice,
            capacity,
        });

        return c.json({ success: true, data }, 201);
    } catch (error: any) {
        console.error('Create listing error:', error);
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get all listings
app.get('/api/listings', async (c) => {
    try {
        const location = c.req.query('location');
        const inventoryType = c.req.query('inventoryType');

        const data = await listingQueries.getAll({
            location: location || undefined,
            inventoryType: inventoryType || undefined,
        });

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error('Get listings error:', error);
        return c.json({ error: error.message }, 500);
    }
});

// Get all reviews for a listing (must be before /api/listings/:id route)
app.get('/api/listings/:listingId/reviews', async (c) => {
    const listingId = c.req.param('listingId');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');

    try {
        const data = await reviewQueries.getByListing(listingId, limit, offset);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Get rating summary for a listing (must be before /api/listings/:id route)
app.get('/api/listings/:listingId/rating-summary', async (c) => {
    const listingId = c.req.param('listingId');

    try {
        const data = await reviewQueries.getRatingSummary(listingId);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({
            success: true,
            data: {
                listingId,
                reviewCount: 0,
                averageRating: 0,
                fiveStar: 0,
                fourStar: 0,
                threeStar: 0,
                twoStar: 0,
                oneStar: 0,
            }
        });
    }
});

// Get a single listing by ID
app.get('/api/listings/:id', async (c) => {
    const id = c.req.param('id');

    try {
        const data = await listingQueries.getById(id);
        if (!data) return c.json({ error: 'Listing not found' }, 404);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Update listing availability (hosts only)
app.patch('/api/listings/:id/availability', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { isAvailable } = body;
        const user = c.get('user');
        // Verify listing belongs to this host
        const listing = await listingQueries.getById(id);
        if (!listing) return c.json({ error: 'Listing not found' }, 404);
        if (listing.hostId !== user.id) return c.json({ error: 'Unauthorized' }, 403);

        const data = await listingQueries.update(id, { isAvailable });
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Update listing (hosts only)
app.put('/api/listings/:id', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const user = c.get('user');
        // Verify listing belongs to this host
        const listing = await listingQueries.getById(id);
        if (!listing) return c.json({ error: 'Listing not found' }, 404);
        if (listing.hostId !== user.id) return c.json({ error: 'Unauthorized' }, 403);

        // Update listing
        const updateData: Record<string, any> = {};
        if (body.title) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.location) updateData.location = body.location;
        if (body.localPrice) updateData.local_price = body.localPrice;
        if (body.foreignPrice) updateData.foreign_price = body.foreignPrice;
        if (body.capacity) updateData.capacity = body.capacity;
        if (body.inventoryType) updateData.inventory_type = body.inventoryType;
        if (body.coverImage !== undefined) updateData.cover_image = body.coverImage;
        if (body.socialMediaInstagram !== undefined) updateData.social_media_instagram = body.socialMediaInstagram;
        if (body.socialMediaFacebook !== undefined) updateData.social_media_facebook = body.socialMediaFacebook;

        const data = await listingQueries.update(id, updateData);
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// ===== BOOKINGS ENDPOINTS =====

// Check availability for a listing
app.post('/api/bookings/check-availability', async (c) => {
    try {
        const { listingId, bookingDate, timeSlot, quantity } = await c.req.json();

            const date = new Date(bookingDate);
            const result = await schedulingService.checkAvailability(
                listingId,
                date,
                timeSlot || null,
                quantity
            );

        return c.json({
            success: true,
            available: result.available,
            remainingCapacity: result.remainingCapacity,
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Create a new booking with dual pricing
// Create a new booking with dual pricing (Protected)
app.post('/api/bookings', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { listingId, bookingDate, quantity, timeSlot } = body;

        // Security: Get authenticated user ID
        const authContext = c.get('user');
        const touristId = authContext.id;

        // 1. Fetch User (Tourist)
        const user = await getUserById(touristId);
        if (!user) return c.json({ error: 'Tourist not found' }, 404);

        // 2. Fetch Listing
        const listing = await listingQueries.getById(listingId);
        if (!listing) return c.json({ error: 'Listing not found' }, 404);

        // 3. Calculate Price
        const domainListing: any = {
            ...listing,
            hostId: listing.hostId,
            inventoryType: listing.inventoryType,
            localPrice: listing.localPrice,
            foreignPrice: listing.foreignPrice,
            createdAt: listing.createdAt,
        };

        const domainUser: any = {
            id: user.id,
            email: user.email,
            userType: user.userType,
            fullName: (user as any).full_name || '',
            country: (user as any).country,
            createdAt: (user as any).created_at,
        };

        const priceResult = pricingService.calculatePrice(domainListing, domainUser, quantity);

        // 4. Create Booking
        const result = await schedulingService.createBooking(
            listingId,
            touristId,
            new Date(bookingDate),
            quantity,
            priceResult.totalPrice,
            priceResult.currency,
            timeSlot || null
        );

        if (!result.success) return c.json({ error: result.error }, 409);

        return c.json({ success: true, bookingId: result.bookingId, price: priceResult }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get a booking by ID
// Get a booking by ID (Protected)
app.get('/api/bookings/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');

    try {
        const data = await bookingQueries.getById(id);
        if (!data) return c.json({ error: 'Booking not found' }, 404);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Get all bookings for a tourist
// Get all bookings for a tourist (Protected)
app.get('/api/tourists/:touristId/bookings', authMiddleware, async (c) => {
    const touristId = c.req.param('touristId');

    try {
        const data = await bookingQueries.getByTourist(touristId);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Get all bookings for a listing
// Get all bookings for a listing (Protected)
app.get('/api/listings/:listingId/bookings', authMiddleware, async (c) => {
    const listingId = c.req.param('listingId');

    try {
        const data = await bookingQueries.getByListing(listingId);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Update booking status (hosts only)
app.patch('/api/bookings/:id/status', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { status } = body;
        const user = c.get('user');

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'accepted', 'not_paid', 'paid', 'completed'];
        if (!validStatuses.includes(status)) {
            return c.json({ error: 'Invalid status' }, 400);
        }

        // Get booking and verify it belongs to a listing owned by this host
        const booking = await bookingQueries.getById(id);
        if (!booking) return c.json({ error: 'Booking not found' }, 404);
        if (!booking.listing) {
            // fetch listing
            const listing = await listingQueries.getById(booking.listingId || booking.listing_id);
            booking.listing = listing;
        }
        if (booking.listing.hostId !== user.id) return c.json({ error: 'Unauthorized' }, 403);

        const data = await bookingQueries.updateStatus(id, status);
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// ===== REVIEWS ENDPOINTS =====

// Create a new review
app.post('/api/reviews', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const user = c.get('user');

        // Validate the review data
        const validatedData = CreateReviewSchema.parse(body);

        // Ensure userId matches authenticated user (Security check)
        if (validatedData.userId !== user.id) {
            return c.json({ error: 'You can only create reviews for yourself' }, 403);
        }

        // If bookingId provided, verify the booking exists and belongs to the user
        if (validatedData.bookingId) {
            const booking = await bookingQueries.getById(validatedData.bookingId);
            if (!booking || booking.touristId !== user.id || booking.status !== 'confirmed') {
                return c.json({ error: 'Booking not found or not confirmed' }, 404);
            }

            if (booking.listingId !== validatedData.listingId) {
                return c.json({ error: 'Booking does not match listing' }, 400);
            }

            const bookingDate = new Date(booking.bookingDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (bookingDate >= today) {
                return c.json({ error: 'Cannot review until booking is complete' }, 400);
            }
        }

        const created = await reviewQueries.create({
            listingId: validatedData.listingId,
            userId: validatedData.userId,
            bookingId: validatedData.bookingId,
            rating: validatedData.rating,
            comment: validatedData.comment,
        });

        return c.json({ success: true, data: created }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get all reviews (with optional filters)
app.get('/api/reviews', async (c) => {
    const userId = c.req.query('userId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    try {
        const data = await reviewQueries.getAll(userId ? { userId } : undefined, limit, offset);
        return c.json({ success: true, data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Update a review
app.put('/api/reviews/:id', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const user = c.get('user');
        const existingReview = await reviewQueries.getById(id);
        if (!existingReview || existingReview.userId !== user.id) {
            return c.json({ error: 'Review not found or unauthorized' }, 404);
        }

        const data = await reviewQueries.update(id, body.rating, body.comment);
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Delete a review
app.delete('/api/reviews/:id', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const user = c.get('user');
        const existingReview = await reviewQueries.getById(id);
        if (!existingReview || existingReview.userId !== user.id) {
            return c.json({ error: 'Review not found or unauthorized' }, 404);
        }

        await reviewQueries.delete(id);
        return c.json({ success: true, message: 'Review deleted' });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Start the server (skip when running under vitest — tests use app.fetch() directly)
import { serve } from '@hono/node-server';

if (!process.env.VITEST) {
    const port = parseInt(process.env.PORT || '3000');
    console.log(`🚀 CeylonBooking API starting on port ${port}...`);

    serve({
        fetch: app.fetch,
        port
    });
}

export { app };
