-- Add is_available column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Create index for filtering available listings
CREATE INDEX IF NOT EXISTS idx_listings_is_available ON listings(is_available);

-- Update RLS policy to allow hosts to update availability
-- (This is already covered by existing "Hosts can update own listings" policy)
