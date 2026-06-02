import { Hono } from 'hono';
import { z } from 'zod';
import {
    generateToken,
    createUser,
    getUserByEmail,
    comparePassword,
    updateUserProfile,
    verifyUserPassword,
} from '@/utils/auth';
import { authMiddleware } from '@/middleware/auth';
import { query } from '@/utils/database';
import { v4 as uuidv4 } from 'uuid';

const auth = new Hono();

// Validation Schemas
const SignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
    userType: z.enum(['tourist', 'host']),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const UpdateProfileSchema = z.object({
    fullName: z.string().min(2).optional(),
    country: z.string().optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
    contactNumber: z.string().optional(),
});

// Register a new user
auth.post('/signup', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password, fullName, userType } = SignupSchema.parse(body);

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return c.json({ error: 'Email already registered' }, 400);
        }

        // Create new user
        const userId = uuidv4();
        const user = await createUser(userId, email, password, fullName, userType);

        // Generate JWT token
        const token = generateToken(user);

        return c.json({
            success: true,
            data: {
                user,
                token
            }
        }, 201);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return c.json({ error: 'Validation failed', details: error.issues }, 400);
        }
        console.error('Signup error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Login user
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = LoginSchema.parse(body);

        // Get user by email
        const user = await getUserByEmail(email);
        if (!user) {
            return c.json({ error: 'Invalid email or password' }, 401);
        }

        // Get password hash
        const results: any = await query(
            'SELECT password_hash FROM users WHERE email = ?',
            [email]
        );

        if (results.length === 0) {
            return c.json({ error: 'Invalid email or password' }, 401);
        }

        // Verify password
        const isValidPassword = await comparePassword(password, results[0].password_hash);
        if (!isValidPassword) {
            return c.json({ error: 'Invalid email or password' }, 401);
        }

        // Generate JWT token
        const token = generateToken(user);

        return c.json({
            success: true,
            data: {
                user,
                token
            }
        });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return c.json({ error: 'Validation failed', details: error.issues }, 400);
        }
        console.error('Login error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Get current user profile
auth.get('/profile', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        
        // Get full user profile from database
        const results: any = await query(
            `SELECT id, email, full_name, user_type, country, contact_number, created_at, updated_at
             FROM users WHERE id = ?`,
            [user.id]
        );

        if (results.length === 0) {
            return c.json({ error: 'User not found' }, 404);
        }

        const userProfile = results[0];
        return c.json({
            success: true,
            data: {
                id: userProfile.id,
                email: userProfile.email,
                fullName: userProfile.full_name,
                userType: userProfile.user_type,
                country: userProfile.country,
                contactNumber: userProfile.contact_number,
                createdAt: userProfile.created_at,
                updatedAt: userProfile.updated_at,
            }
        });

    } catch (error: any) {
        console.error('Get profile error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Update user profile
auth.put('/profile', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const updates = UpdateProfileSchema.parse(body);
        const user = c.get('user');

        // If email is being changed, check it's not already in use
        if (updates.email && updates.email !== user.email) {
            const existingUser = await getUserByEmail(updates.email);
            if (existingUser) {
                return c.json({ error: 'Email already in use' }, 400);
            }
        }

        // If password is being changed, verify current password
        if (updates.newPassword && updates.currentPassword) {
            const isValid = await verifyUserPassword(user.id, updates.currentPassword);
            if (!isValid) {
                return c.json({ error: 'Current password is incorrect' }, 400);
            }
        }

        // Update user profile
        await updateUserProfile(user.id, {
            fullName: updates.fullName,
            country: updates.country,
            email: updates.email,
            contactNumber: updates.contactNumber,
            password: updates.newPassword,
        });

        // Get updated profile
        const results: any = await query(
            `SELECT id, email, full_name, user_type, country, contact_number, created_at, updated_at
             FROM users WHERE id = ?`,
            [user.id]
        );

        if (results.length === 0) {
            return c.json({ error: 'User not found' }, 404);
        }

        const userProfile = results[0];
        return c.json({
            success: true,
            data: {
                id: userProfile.id,
                email: userProfile.email,
                fullName: userProfile.full_name,
                userType: userProfile.user_type,
                country: userProfile.country,
                contactNumber: userProfile.contact_number,
                createdAt: userProfile.created_at,
                updatedAt: userProfile.updated_at,
            }
        });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return c.json({ error: 'Validation failed', details: error.issues }, 400);
        }
        console.error('Update profile error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

export { auth as authRouter };
