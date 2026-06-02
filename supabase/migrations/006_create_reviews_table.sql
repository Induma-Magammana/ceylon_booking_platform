-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate reviews: one review per booking
  UNIQUE(booking_id),
  -- Allow multiple reviews per user-listing pair (for different bookings)
  -- But enforce booking_id uniqueness
  CONSTRAINT valid_review CHECK (booking_id IS NOT NULL OR (listing_id IS NOT NULL AND user_id IS NOT NULL))
);

-- Create index on listing_id for fetching reviews by listing
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);

-- Create index on user_id for fetching user's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Create index on rating for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Create index on created_at for sorting by date
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Create a view for listing ratings summary
CREATE OR REPLACE VIEW listing_ratings AS
SELECT 
  listing_id,
  COUNT(*) as review_count,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
FROM reviews
GROUP BY listing_id;

-- Enable RLS on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON reviews FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" 
ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" 
ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" 
ON reviews FOR DELETE USING (auth.uid() = user_id);
