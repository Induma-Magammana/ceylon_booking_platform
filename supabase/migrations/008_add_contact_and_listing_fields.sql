-- Add contact number to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add listing fields: cover_image (required), social media links (optional)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cover_image TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS social_media_instagram TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS social_media_facebook TEXT;

-- Create index on contact_number for searching
CREATE INDEX IF NOT EXISTS idx_users_contact_number ON users(contact_number);

-- Update RLS policies (existing policies should handle these new fields)
