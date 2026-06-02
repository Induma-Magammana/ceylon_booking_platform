import { Context, Next } from 'hono';
import { verifyToken, AuthUser as JWTAuthUser } from '@/utils/auth';

// Define the type for the user object in context
export type AuthUser = {
    id: string;
    email: string;
    userType: 'tourist' | 'host';
};

// Extend Hono Context to include user
declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser;
    }
}

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT token
    console.log('Auth check token:', token.substring(0, 10) + '...');
    const decoded = verifyToken(token);

    if (!decoded) {
        console.error('Auth verify error: Invalid or expired token');
        return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }

    console.log('Auth success for user:', decoded.id);

    // Attach user to context
    c.set('user', {
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType
    });

    await next();
};
