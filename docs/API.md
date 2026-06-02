# CeylonBooking API Documentation

## Base URL

```
Development: http://localhost:3000
Production: https://api.ceylonbooking.lk (planned)
```

## Authentication

All endpoints (except `/health`) require authentication via Supabase Auth.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T10:00:00.000Z"
}
```

---

## Listings

### Create Listing

#### `POST /api/listings`

Create a new experience or accommodation listing.

**Request Body:**
```json
{
  "hostId": "uuid",
  "title": "Whale Watching Tour",
  "description": "Amazing whale watching experience in Mirissa",
  "inventoryType": "slot",
  "location": "Mirissa",
  "localPrice": 5000,
  "foreignPrice": 50,
  "capacity": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hostId | UUID | Yes | ID of the host creating the listing |
| title | string | Yes | Title of the experience |
| description | string | No | Detailed description |
| inventoryType | enum | Yes | `slot` (time-based) or `date` (night-based) |
| location | string | Yes | Physical location |
| localPrice | number | Yes | Price in LKR for locals |
| foreignPrice | number | Yes | Price in USD for tourists |
| capacity | integer | Yes | Maximum capacity per slot/date |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "host_id": "uuid",
    "title": "Whale Watching Tour",
    "description": "Amazing whale watching experience in Mirissa",
    "inventory_type": "slot",
    "location": "Mirissa",
    "local_price": 5000,
    "foreign_price": 50,
    "capacity": 20,
    "created_at": "2026-01-25T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Validation error message"
}
```

---

### Get All Listings

#### `GET /api/listings`

Retrieve all listings with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| location | string | Filter by location (partial match) |
| inventoryType | enum | Filter by `slot` or `date` |

**Example Request:**
```
GET /api/listings?location=Mirissa&inventoryType=slot
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "host_id": "host-uuid",
      "title": "Whale Watching Tour",
      "inventory_type": "slot",
      "location": "Mirissa",
      "local_price": 5000,
      "foreign_price": 50,
      "capacity": 20,
      "created_at": "2026-01-25T10:00:00.000Z"
    }
  ]
}
```

---

### Get Single Listing

#### `GET /api/listings/:id`

Retrieve a specific listing by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Listing ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "host_id": "host-uuid",
    "title": "Whale Watching Tour",
    "description": "Amazing whale watching experience",
    "inventory_type": "slot",
    "location": "Mirissa",
    "local_price": 5000,
    "foreign_price": 50,
    "capacity": 20,
    "created_at": "2026-01-25T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Listing not found"
}
```

---

### Get Listing Bookings

#### `GET /api/listings/:listingId/bookings`

Get all bookings for a specific listing (for hosts).

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| listingId | UUID | Listing ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "listing_id": "listing-uuid",
      "tourist_id": "tourist-uuid",
      "booking_date": "2026-02-15",
      "time_slot": "09:00:00",
      "quantity": 2,
      "total_price": 10000,
      "currency": "LKR",
      "status": "confirmed",
      "created_at": "2026-01-25T10:00:00.000Z"
    }
  ]
}
```

---

## Bookings

### Check Availability

#### `POST /api/bookings/check-availability`

Check if a booking can be made for a specific date/time.

**Request Body:**
```json
{
  "listingId": "uuid",
  "bookingDate": "2026-02-15",
  "timeSlot": "09:00:00",
  "quantity": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| listingId | UUID | Yes | ID of the listing |
| bookingDate | date | Yes | Date to check (YYYY-MM-DD) |
| timeSlot | time | No | Time slot (HH:MM:SS), null for date-based |
| quantity | integer | Yes | Number of spots needed |

**Success Response (200):**
```json
{
  "success": true,
  "available": true,
  "remainingCapacity": 18
}
```

---

### Create Booking

#### `POST /api/bookings`

Create a new booking (with automatic availability check).

**Request Body:**
```json
{
  "listingId": "uuid",
  "touristId": "uuid",
  "bookingDate": "2026-02-15",
  "timeSlot": "09:00:00",
  "quantity": 2,
  "totalPrice": 10000,
  "currency": "LKR"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| listingId | UUID | Yes | ID of the listing |
| touristId | UUID | Yes | ID of the tourist making the booking |
| bookingDate | date | Yes | Date of booking (YYYY-MM-DD) |
| timeSlot | time | No | Time slot (HH:MM:SS), null for date-based |
| quantity | integer | Yes | Number of spots to book |
| totalPrice | number | Yes | Total price for the booking |
| currency | enum | Yes | `LKR` or `USD` |

**Success Response (201):**
```json
{
  "success": true,
  "bookingId": "generated-uuid"
}
```

**Conflict Response (409):**
```json
{
  "error": "Insufficient capacity. Only 5 slots remaining."
}
```

**Error Response (400):**
```json
{
  "error": "Validation error message"
}
```

---

### Get Booking

#### `GET /api/bookings/:id`

Retrieve a specific booking by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Booking ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "listing_id": "listing-uuid",
    "tourist_id": "tourist-uuid",
    "booking_date": "2026-02-15",
    "time_slot": "09:00:00",
    "quantity": 2,
    "total_price": 10000,
    "currency": "LKR",
    "status": "pending",
    "created_at": "2026-01-25T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Booking not found"
}
```

---

### Get Tourist Bookings

#### `GET /api/tourists/:touristId/bookings`

Get all bookings for a specific tourist.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| touristId | UUID | Tourist user ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "listing_id": "listing-uuid",
      "tourist_id": "tourist-uuid",
      "booking_date": "2026-02-15",
      "time_slot": "09:00:00",
      "quantity": 2,
      "total_price": 10000,
      "currency": "LKR",
      "status": "confirmed",
      "created_at": "2026-01-25T10:00:00.000Z",
      "listing": {
        "id": "listing-uuid",
        "title": "Whale Watching Tour",
        "location": "Mirissa"
      }
    }
  ]
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., double booking) |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are limited to:
- **100 requests per minute** for authenticated users
- **10 requests per minute** for unauthenticated requests

---

## Changelog

### v1.0.0 (2026-01-25)
- Initial API release
- Listings CRUD endpoints
- Booking creation with availability check
- Conflict detection for double bookings
