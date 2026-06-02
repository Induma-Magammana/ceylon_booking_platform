-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
-- Everyone can view basic user info (needed for reviews, bookings etc)
CREATE POLICY "Public profiles are viewable by everyone" 
ON users FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE USING (auth.uid() = id);

-- LISTINGS POLICIES
-- Everyone can view listings
CREATE POLICY "Listings are viewable by everyone" 
ON listings FOR SELECT USING (true);

-- Hosts can insert listings (user_type check is business logic, here we check ownership)
CREATE POLICY "Hosts can insert their own listings" 
ON listings FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own listings
CREATE POLICY "Hosts can update own listings" 
ON listings FOR UPDATE USING (auth.uid() = host_id);

-- BOOKINGS POLICIES
-- Tourists can view their own bookings
CREATE POLICY "Users can view own bookings" 
ON bookings FOR SELECT USING (auth.uid() = tourist_id);

-- Hosts can view bookings for their listings
-- (This requires a subquery to check if the user owns the listing)
CREATE POLICY "Hosts can view bookings for their listings" 
ON bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.id = bookings.listing_id 
    AND listings.host_id = auth.uid()
  )
);

-- Authenticated users can create bookings
CREATE POLICY "Authenticated users can insert bookings" 
ON bookings FOR INSERT WITH CHECK (auth.uid() = tourist_id);
