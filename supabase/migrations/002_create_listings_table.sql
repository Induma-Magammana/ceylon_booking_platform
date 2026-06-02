-- Create listings table
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

-- Create index on host_id for fetching host's listings
CREATE INDEX IF NOT EXISTS idx_listings_host_id ON listings(host_id);

-- Create index on location for search
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);

-- Create index on inventory_type for filtering
CREATE INDEX IF NOT EXISTS idx_listings_inventory_type ON listings(inventory_type);
