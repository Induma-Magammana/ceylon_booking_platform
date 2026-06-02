-- Add country column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);

-- Add comment explaining usage
COMMENT ON COLUMN users.country IS 'ISO 3166-1 alpha-2 country code (e.g., LK, US)';
