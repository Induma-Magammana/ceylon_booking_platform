-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  tourist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  time_slot TIME, -- NULL for date-based bookings
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  currency TEXT CHECK (currency IN ('LKR', 'USD')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent double bookings: unique constraint on listing, date, and time slot
  UNIQUE(listing_id, booking_date, time_slot)
);

-- Create index on listing_id for fetching bookings by listing
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);

-- Create index on tourist_id for fetching user's bookings
CREATE INDEX IF NOT EXISTS idx_bookings_tourist_id ON bookings(tourist_id);

-- Create index on booking_date for date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);

-- Create composite index for availability checks
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
  ON bookings(listing_id, booking_date, time_slot) 
  WHERE status != 'cancelled';
