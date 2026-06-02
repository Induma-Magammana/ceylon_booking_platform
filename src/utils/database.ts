import mysql from 'mysql2/promise';
import { Pool } from 'mysql2/promise';

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ceylon_booking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const getPool = (): Pool => pool;

// Query helper function
export const query = async (sql: string, values?: any[]) => {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, values);
        return results;
    } finally {
        connection.release();
    }
};

// Database initialization - Create tables if they don't exist
export const initializeDatabase = async () => {
    const connection = await pool.getConnection();
    try {
        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                user_type ENUM('tourist', 'host') NOT NULL,
                country VARCHAR(100),
                contact_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_user_type (user_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Listings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS listings (
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
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_host_id (host_id),
                INDEX idx_location (location),
                INDEX idx_inventory_type (inventory_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Bookings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bookings (
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
                FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_listing_id (listing_id),
                INDEX idx_tourist_id (tourist_id),
                INDEX idx_booking_date (booking_date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Reviews table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS reviews (
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
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
                INDEX idx_listing_id (listing_id),
                INDEX idx_user_id (user_id),
                INDEX idx_rating (rating)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Listing ratings summary table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS listing_ratings (
                listing_id VARCHAR(36) PRIMARY KEY,
                review_count INT DEFAULT 0,
                average_rating DECIMAL(3, 2) DEFAULT 0,
                five_star INT DEFAULT 0,
                four_star INT DEFAULT 0,
                three_star INT DEFAULT 0,
                two_star INT DEFAULT 0,
                one_star INT DEFAULT 0,
                FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ Database tables initialized successfully');
    } finally {
        connection.release();
    }
};

// Close pool
export const closePool = async () => {
    await pool.end();
};
