import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { authMiddleware } from '@/middleware/auth';
import { authRouter } from '@/api/auth';
import { initializeDatabase } from '@/utils/database';
import { query } from '@/utils/database';
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

    const { data, error } = await supabase
        .from('reviews')
        .select(`
            *,
            user:users(id, full_name, email)
        `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Get rating summary for a listing (must be before /api/listings/:id route)
app.get('/api/listings/:listingId/rating-summary', async (c) => {
    const listingId = c.req.param('listingId');

    const { data, error } = await supabase
        .from('listing_ratings')
        .select('*')
        .eq('listing_id', listingId)
        .single();

    if (error) {
        // If no reviews exist, return default values
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

    return c.json({ success: true, data });
});

// Get a single listing by ID
app.get('/api/listings/:id', async (c) => {
    const id = c.req.param('id');

    const { data, error } = await supabase
        .from('listings')
        .select(`
            *,
            host:users!listings_host_id_fkey (
                id,
                full_name,
                email,
                contact_number
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        return c.json({ error: 'Listing not found' }, 404);
    }

    return c.json({ success: true, data });
});

// Update listing availability (hosts only)
app.patch('/api/listings/:id/availability', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { isAvailable } = body;
        const user = c.get('user');
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Verify listing belongs to this host
        const { data: listing, error: fetchError } = await authSupabase
            .from('listings')
            .select('host_id')
            .eq('id', id)
            .single();

        if (fetchError || !listing) {
            return c.json({ error: 'Listing not found' }, 404);
        }

        if (listing.host_id !== user.id) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        // Update availability
        const { data, error } = await authSupabase
            .from('listings')
            .update({ is_available: isAvailable })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

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
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Verify listing belongs to this host
        const { data: listing, error: fetchError } = await authSupabase
            .from('listings')
            .select('host_id')
            .eq('id', id)
            .single();

        if (fetchError || !listing) {
            return c.json({ error: 'Listing not found' }, 404);
        }

        if (listing.host_id !== user.id) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

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

        const { data, error } = await authSupabase
            .from('listings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

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
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Security: Get authenticated user ID
        const authContext = c.get('user');
        const touristId = authContext.id;

        // Use authenticated service
        const authSchedulingService = new SchedulingService(authSupabase);

        // 1. Fetch User (Tourist)
        const { data: user, error: userError } = await authSupabase
            .from('users')
            .select('*')
            .eq('id', touristId)
            .single();

        if (userError || !user) {
            return c.json({ error: 'Tourist not found' }, 404);
        }

        // 2. Fetch Listing
        const { data: listing, error: listingError } = await authSupabase
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (listingError || !listing) {
            return c.json({ error: 'Listing not found' }, 404);
        }

        // 3. Calculate Price
        // Map DB fields (snake_case) to Domain model (camelCase)
        const domainListing: Listing = {
            ...listing,
            hostId: listing.host_id,
            inventoryType: listing.inventory_type,
            localPrice: listing.local_price,
            foreignPrice: listing.foreign_price,
            createdAt: new Date(listing.created_at),
        };

        const domainUser: User = {
            id: user.id,
            email: user.email,
            userType: user.user_type,
            fullName: user.full_name, // Map snake_case to camelCase
            country: user.country,
            createdAt: new Date(user.created_at),
        };

        const priceResult = pricingService.calculatePrice(
            domainListing,
            domainUser,
            quantity
        );

        // 4. Create Booking
        const result = await authSchedulingService.createBooking(
            listingId,
            touristId,
            new Date(bookingDate),
            quantity,
            priceResult.totalPrice, // Use calculated price
            priceResult.currency,   // Use calculated currency
            timeSlot || null
        );

        if (!result.success) {
            return c.json({ error: result.error }, 409);
        }

        return c.json({
            success: true,
            bookingId: result.bookingId,
            price: priceResult // Return pricing details
        }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get a booking by ID
// Get a booking by ID (Protected)
app.get('/api/bookings/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return c.json({ error: 'Booking not found' }, 404);
    }

    return c.json({ success: true, data });
});

// Get all bookings for a tourist
// Get all bookings for a tourist (Protected)
app.get('/api/tourists/:touristId/bookings', authMiddleware, async (c) => {
    const touristId = c.req.param('touristId');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select(`
      *,
      listing:listings(*)
    `)
        .eq('tourist_id', touristId)
        .order('created_at', { ascending: false });

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Get all bookings for a listing
// Get all bookings for a listing (Protected)
app.get('/api/listings/:listingId/bookings', authMiddleware, async (c) => {
    const listingId = c.req.param('listingId');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select(`
            *,
            tourist:users!tourist_id(id, full_name, email, contact_number),
            listing:listings(id, title, location)
        `)
        .eq('listing_id', listingId)
        .order('booking_date', { ascending: true });

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Update booking status (hosts only)
app.patch('/api/bookings/:id/status', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { status } = body;
        const user = c.get('user');
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'accepted', 'not_paid', 'paid', 'completed'];
        if (!validStatuses.includes(status)) {
            return c.json({ error: 'Invalid status' }, 400);
        }

        // Get booking and verify it belongs to a listing owned by this host
        const { data: booking, error: fetchError } = await authSupabase
            .from('bookings')
            .select(`
                *,
                listing:listings!listing_id(id, host_id)
            `)
            .eq('id', id)
            .single();

        if (fetchError || !booking) {
            return c.json({ error: 'Booking not found' }, 404);
        }

        // Check if user is the host of this listing
        if (booking.listing.host_id !== user.id) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        // Update booking status
        const { data, error } = await authSupabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select(`
                *,
                tourist:users!tourist_id(id, full_name, email, contact_number),
                listing:listings(id, title, location)
            `)
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

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
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);
        const user = c.get('user');

        // Validate the review data
        const validatedData = CreateReviewSchema.parse(body);

        // Ensure userId matches authenticated user (Security check)
        if (validatedData.userId !== user.id) {
            return c.json({ error: 'You can only create reviews for yourself' }, 403);
        }

        // If bookingId provided, verify the booking exists and belongs to the user
        if (validatedData.bookingId) {
            const { data: booking, error: bookingError } = await authSupabase
                .from('bookings')
                .select('*')
                .eq('id', validatedData.bookingId)
                .eq('tourist_id', user.id)
                .eq('status', 'confirmed')
                .single();

            if (bookingError || !booking) {
                return c.json({ error: 'Booking not found or not confirmed' }, 404);
            }

            // Verify booking is for the correct listing
            if (booking.listing_id !== validatedData.listingId) {
                return c.json({ error: 'Booking does not match listing' }, 400);
            }

            // Check if booking date has passed
            const bookingDate = new Date(booking.booking_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (bookingDate >= today) {
                return c.json({ error: 'Cannot review until booking is complete' }, 400);
            }
        }

        const { data, error } = await authSupabase
            .from('reviews')
            .insert({
                listing_id: validatedData.listingId,
                user_id: validatedData.userId,
                booking_id: validatedData.bookingId,
                rating: validatedData.rating,
                comment: validatedData.comment,
            })
            .select()
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

        return c.json({ success: true, data }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get all reviews (with optional filters)
app.get('/api/reviews', async (c) => {
    const userId = c.req.query('userId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = supabase
        .from('reviews')
        .select(`
            *,
            user:users(id, full_name),
            listing:listings(id, title, location)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Update a review
app.put('/api/reviews/:id', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);
        const user = c.get('user');

        // Verify review belongs to user
        const { data: existingReview, error: fetchError } = await authSupabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existingReview) {
            return c.json({ error: 'Review not found or unauthorized' }, 404);
        }

        const { data, error } = await authSupabase
            .from('reviews')
            .update({
                rating: body.rating,
                comment: body.comment,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Delete a review
app.delete('/api/reviews/:id', authMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);
        const user = c.get('user');

        // Verify review belongs to user
        const { data: existingReview, error: fetchError } = await authSupabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existingReview) {
            return c.json({ error: 'Review not found or unauthorized' }, 404);
        }

        const { error } = await authSupabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) {
            return c.json({ error: error.message }, 400);
        }

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
