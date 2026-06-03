import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getDb, connectDB } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '24h';

export interface AuthUser {
    id: string;
    email: string;
    userType: 'tourist' | 'host';
}

export interface TokenPayload extends AuthUser {
    iat: number;
    exp: number;
}

// Generate JWT token
export const generateToken = (user: AuthUser): string => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Verify JWT token
export const verifyToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
};

// Compare password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

// Ensure DB connection is established before using these helpers
const ensureDb = async () => {
    try {
        getDb();
    } catch (e) {
        await connectDB();
    }
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<AuthUser | null> => {
    await ensureDb();
    const users = getDb().collection('users');
    const user: any = await users.findOne({ email });
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        userType: user.user_type || user.userType,
    };
};

// Get user by ID
export const getUserById = async (id: string): Promise<AuthUser | null> => {
    await ensureDb();
    const users = getDb().collection('users');
    const user: any = await users.findOne({ id });
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        userType: user.user_type || user.userType,
    };
};

// Create new user
export const createUser = async (
    id: string,
    email: string,
    password: string,
    fullName: string,
    userType: 'tourist' | 'host'
): Promise<AuthUser> => {
    await ensureDb();
    const users = getDb().collection('users');
    const passwordHash = await hashPassword(password);

    const doc = {
        id,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        user_type: userType,
        country: null,
        contact_number: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    await users.insertOne(doc);

    return {
        id,
        email,
        userType,
    };
};

// Update user profile
export const updateUserProfile = async (
    userId: string,
    updates: {
        fullName?: string;
        country?: string;
        contactNumber?: string;
        email?: string;
        password?: string;
    }
): Promise<void> => {
    await ensureDb();
    const users = getDb().collection('users');
    const set: any = {};

    if (updates.fullName !== undefined) set.full_name = updates.fullName;
    if (updates.country !== undefined) set.country = updates.country;
    if (updates.contactNumber !== undefined) set.contact_number = updates.contactNumber;
    if (updates.email !== undefined) set.email = updates.email;
    if (updates.password !== undefined) set.password_hash = await hashPassword(updates.password);

    if (Object.keys(set).length === 0) return;

    set.updated_at = new Date();

    await users.updateOne({ id: userId }, { $set: set });
};

// Verify password for user
export const verifyUserPassword = async (userId: string, password: string): Promise<boolean> => {
    await ensureDb();
    const users = getDb().collection('users');
    const user: any = await users.findOne({ id: userId });
    if (!user) return false;
    return comparePassword(password, user.password_hash);
};
