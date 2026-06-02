# MySQL Migration Guide - CeylonBooking Platform

## ✅ Completed Migration Tasks

### 1. ✅ Dependencies Updated (package.json)
- Removed: `@supabase/supabase-js`
- Added: `mysql2`, `jsonwebtoken`, `bcrypt`, `uuid`

### 2. ✅ Database Utilities (src/utils/database.ts)
- MySQL connection pooling with auto-reconnect
- `initializeDatabase()` - automatically creates all tables on startup
- `query()` helper for executing raw SQL queries

### 3. ✅ Authentication Utilities (src/utils/auth.ts)
- JWT token generation and verification
- Password hashing with bcrypt
- User CRUD operations (create, get by email/id, update)

### 4. ✅ Query Helpers (src/utils/queries.ts)
Complete CRUD operations for:
- **Listings**: Create, Read, Update, Delete with filters
- **Bookings**: Create, Read, Update status, Delete, Check availability
- **Reviews**: Create, Read (all/by listing), Update, Delete, Get rating summary

### 5. ✅ Authentication Middleware (src/middleware/auth.ts)
- Updated to use JWT instead of Supabase Auth
- Token verification and user context injection

### 6. ✅ Auth Routes (src/api/auth.ts)
Fully migrated endpoints:
- `POST /api/auth/signup` - Create user + JWT token
- `POST /api/auth/login` - Authenticate user + JWT token  
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)

### 7. ✅ CORS Support
- Added `hono/cors` middleware
- Configured for development on ports 3000, 3001, 5175

### 8. ✅ Image Upload
- Changed from Supabase Storage to local filesystem
- Stores images in `uploads/listings/` directory

## 📝 Still Needed - API Endpoints Migration

The following endpoints in `src/api/index.ts` need to be updated to use MySQL queries:

### Listings Endpoints (to migrate)
```typescript
// Create listing
app.post('/api/listings', authMiddleware, async (c) => {
    const data = await listingQueries.create({ ... });
    return c.json({ success: true, data }, 201);
});

// Get all listings
app.get('/api/listings', async (c) => {
    const data = await listingQueries.getAll({ ... });
    return c.json({ success: true, data });
});

// Get single listing
app.get('/api/listings/:id', async (c) => {
    const data = await listingQueries.getById(c.req.param('id'));
    if (!data) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true, data });
});

// Update listing
app.put('/api/listings/:id', authMiddleware, async (c) => {
    // Verify host ownership first
    const data = await listingQueries.update(id, body);
    return c.json({ success: true, data });
});

// Update availability
app.patch('/api/listings/:id/availability', authMiddleware, async (c) => {
    const data = await listingQueries.update(id, { isAvailable: body.isAvailable });
    return c.json({ success: true, data });
});
```

### Bookings Endpoints (to migrate)
```typescript
// Check availability
app.post('/api/bookings/check-availability', async (c) => {
    const result = await bookingQueries.checkAvailability(...);
    return c.json({ success: true, ...result });
});

// Create booking
app.post('/api/bookings', authMiddleware, async (c) => {
    const data = await bookingQueries.create({ ... });
    return c.json({ success: true, bookingId: data.id }, 201);
});

// Get booking by ID
app.get('/api/bookings/:id', authMiddleware, async (c) => {
    const data = await bookingQueries.getById(c.req.param('id'));
    return c.json({ success: true, data });
});

// Get tourist bookings
app.get('/api/tourists/:touristId/bookings', authMiddleware, async (c) => {
    const data = await bookingQueries.getByTourist(touristId);
    return c.json({ success: true, data });
});

// Get listing bookings
app.get('/api/listings/:listingId/bookings', authMiddleware, async (c) => {
    const data = await bookingQueries.getByListing(listingId);
    return c.json({ success: true, data });
});

// Update booking status
app.patch('/api/bookings/:id/status', authMiddleware, async (c) => {
    const data = await bookingQueries.updateStatus(id, status);
    return c.json({ success: true, data });
});
```

### Reviews Endpoints (to migrate)
```typescript
// Create review
app.post('/api/reviews', authMiddleware, async (c) => {
    const data = await reviewQueries.create({ ... });
    return c.json({ success: true, data }, 201);
});

// Get all reviews
app.get('/api/reviews', async (c) => {
    const data = await reviewQueries.getAll({ userId: userId }, limit, offset);
    return c.json({ success: true, data });
});

// Update review
app.put('/api/reviews/:id', authMiddleware, async (c) => {
    const data = await reviewQueries.update(id, rating, comment);
    return c.json({ success: true, data });
});

// Delete review
app.delete('/api/reviews/:id', authMiddleware, async (c) => {
    await reviewQueries.delete(id);
    return c.json({ success: true, message: 'Deleted' });
});
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_type ENUM('tourist', 'host') NOT NULL,
    country VARCHAR(100),
    contact_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Listings Table
```sql
CREATE TABLE listings (
    id VARCHAR(36) PRIMARY KEY,
    host_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    inventory_type ENUM('slot', 'date') NOT NULL,
    location VARCHAR(255) NOT NULL,
    local_price DECIMAL(10, 2) NOT NULL,
    foreign_price DECIMAL(10, 2) NOT NULL,
    capacity INT NOT NULL,
    cover_image VARCHAR(500),
    social_media_instagram VARCHAR(255),
    social_media_facebook VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    tourist_id VARCHAR(36) NOT NULL,
    booking_date DATE NOT NULL,
    time_slot TIME,
    quantity INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    currency ENUM('LKR', 'USD') NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'accepted', 'not_paid', 'paid', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);
```

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your MySQL connection details
```

3. **Start MySQL server**:
```bash
# On Windows with MySQL installed
mysql -u root -p

# Or use Docker
docker run --name ceylon-mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:8.0
```

4. **Start the backend** (database tables auto-create):
```bash
npm run dev:backend
```

The API will start on port 3001 (or your configured PORT).

## Available Query Functions Reference

### Import in endpoints:
```typescript
import { listingQueries, bookingQueries, reviewQueries } from '@/utils/queries';
```

### Usage Examples:
```typescript
// Listings
const listing = await listingQueries.getById('listing-id');
const allListings = await listingQueries.getAll({ location: 'Mirissa' });
const hostListings = await listingQueries.getByHost(userId);
await listingQueries.create({ hostId, title, ... });
await listingQueries.update(id, { title: 'New title' });
await listingQueries.delete(id);

// Bookings
const booking = await bookingQueries.getById('booking-id');
const available = await bookingQueries.checkAvailability(listingId, date, timeSlot, quantity);
const bookingData = await bookingQueries.create({ listingId, touristId, ... });
await bookingQueries.updateStatus(id, 'confirmed');

// Reviews
const reviews = await reviewQueries.getByListing(listingId, limit, offset);
const summary = await reviewQueries.getRatingSummary(listingId);
await reviewQueries.create({ listingId, userId, rating, comment });
await reviewQueries.update(id, newRating, newComment);
await reviewQueries.delete(id);
```

## Migration Status

- ✅ Database utilities
- ✅ Authentication (JWT)
- ✅ Query helpers (all CRUD operations)
- ✅ Auth endpoints (signup, login, profile)
- ✅ Middleware updates
- ✅ CORS configuration
- ✅ Environment configuration
- ⏳ Listings endpoints (ready to implement using listingQueries)
- ⏳ Bookings endpoints (ready to implement using bookingQueries)
- ⏳ Reviews endpoints (ready to implement using reviewQueries)

All the heavy lifting is done - the API endpoints just need to be updated to call the new query functions instead of Supabase!

