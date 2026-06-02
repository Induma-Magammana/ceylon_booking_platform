-- CeylonBooking Platform - Combined Database Migrations
-- This file is auto-generated from supabase/migrations/*.sql
-- It runs on first Postgres container startup via /docker-entrypoint-initdb.d/

-- ============================================================
-- 001: Create users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_type TEXT CHECK (user_type IN ('tourist', 'host')) NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- ============================================================
-- 002: Create listings table
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  inventory_type TEXT CHECK (inventory_type IN ('slot', 'date')) NOT NULL,
  location TEXT NOT NULL,
  local_price DECIMAL(10,2) NOT NULL CHECK (local_price > 0),
  foreign_price DECIMAL(10,2) NOT NULL CHECK (foreign_price > 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_host_id ON listings(host_id);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);
CREATE INDEX IF NOT EXISTS idx_listings_inventory_type ON listings(inventory_type);

-- ============================================================
-- 003: Create bookings table
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  tourist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  time_slot TIME,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  currency TEXT CHECK (currency IN ('LKR', 'USD')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, booking_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist_id ON bookings(tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_availability
  ON bookings(listing_id, booking_date, time_slot)
  WHERE status != 'cancelled';

-- ============================================================
-- 004: Add country column to users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);
COMMENT ON COLUMN users.country IS 'ISO 3166-1 alpha-2 country code (e.g., LK, US)';

-- ============================================================
-- 005: Enable RLS and create policies
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- LISTINGS POLICIES
CREATE POLICY "Listings are viewable by everyone"
ON listings FOR SELECT USING (true);

CREATE POLICY "Hosts can insert their own listings"
ON listings FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own listings"
ON listings FOR UPDATE USING (auth.uid() = host_id);

-- BOOKINGS POLICIES
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT USING (auth.uid() = tourist_id);

CREATE POLICY "Hosts can view bookings for their listings"
ON bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = bookings.listing_id
    AND listings.host_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can insert bookings"
ON bookings FOR INSERT WITH CHECK (auth.uid() = tourist_id);
