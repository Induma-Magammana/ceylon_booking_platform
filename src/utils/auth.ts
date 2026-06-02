import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from './database';

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

// Get user by email
export const getUserByEmail = async (email: string): Promise<AuthUser | null> => {
    const results: any = await query(
        'SELECT id, email, user_type FROM users WHERE email = ?',
        [email]
    );
    if (results.length === 0) return null;
    
    const user = results[0];
    return {
        id: user.id,
        email: user.email,
        userType: user.user_type
    };
};

// Get user by ID
export const getUserById = async (id: string): Promise<AuthUser | null> => {
    const results: any = await query(
        'SELECT id, email, user_type FROM users WHERE id = ?',
        [id]
    );
    if (results.length === 0) return null;
    
    const user = results[0];
    return {
        id: user.id,
        email: user.email,
        userType: user.user_type
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
    const passwordHash = await hashPassword(password);
    
    await query(
        'INSERT INTO users (id, email, password_hash, full_name, user_type) VALUES (?, ?, ?, ?, ?)',
        [id, email, passwordHash, fullName, userType]
    );

    return {
        id,
        email,
        userType
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
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.fullName !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
    }
    if (updates.country !== undefined) {
        fields.push('country = ?');
        values.push(updates.country);
    }
    if (updates.contactNumber !== undefined) {
        fields.push('contact_number = ?');
        values.push(updates.contactNumber);
    }
    if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
    }
    if (updates.password !== undefined) {
        const passwordHash = await hashPassword(updates.password);
        fields.push('password_hash = ?');
        values.push(passwordHash);
    }

    if (fields.length === 0) return;

    values.push(userId);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    await query(sql, values);
};

// Verify password for user
export const verifyUserPassword = async (userId: string, password: string): Promise<boolean> => {
    const results: any = await query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
    );
    
    if (results.length === 0) return false;
    
    return comparePassword(password, results[0].password_hash);
};
