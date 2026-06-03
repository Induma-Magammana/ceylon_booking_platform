import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB_NAME || process.env.MONGO_DB || 'ceylon_booking';

const client = new MongoClient(uri);
let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        console.log('✅ MongoDB client connected');
    }
    return db;
};

export const getDb = (): Db => {
    if (!db) throw new Error('Database not initialized. Call connectDB() first.');
    return db as Db;
};

export const initializeDatabase = async () => {
    const database = await connectDB();

    // Create collections and indexes similar to previous SQL schema
    const users = database.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ user_type: 1 });

    const listings = database.collection('listings');
    await listings.createIndex({ host_id: 1 });
    await listings.createIndex({ location: 1 });
    await listings.createIndex({ inventory_type: 1 });

    const bookings = database.collection('bookings');
    await bookings.createIndex({ listing_id: 1 });
    await bookings.createIndex({ tourist_id: 1 });
    await bookings.createIndex({ booking_date: 1 });
    await bookings.createIndex({ status: 1 });

    const reviews = database.collection('reviews');
    await reviews.createIndex({ listing_id: 1 });
    await reviews.createIndex({ user_id: 1 });
    await reviews.createIndex({ rating: 1 });

    const listingRatings = database.collection('listing_ratings');
    await listingRatings.createIndex({ listing_id: 1 }, { unique: true });

    console.log('✅ MongoDB collections and indexes initialized');
};

export const closeClient = async () => {
    await client.close();
    db = null;
};

// NOTE: The project previously exported a SQL `query()` helper.
// After migration to MongoDB, update `src/utils/queries.ts` and code
// that uses raw SQL to use MongoDB collections via `getDb()`.
