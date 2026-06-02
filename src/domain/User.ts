import { z } from 'zod';

// User type enum
export const UserType = {
    TOURIST: 'tourist',
    HOST: 'host',
} as const;

export type UserType = typeof UserType[keyof typeof UserType];

// User schema with Zod validation
export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().min(1),
    userType: z.enum(['tourist', 'host']),
    fullName: z.string().min(1),
    country: z.string().length(2).optional(), // ISO 2-letter country code
    createdAt: z.date(),
});

// Type inference from schema
export type User = z.infer<typeof UserSchema>;

// Helper function to create a user
export const createUser = (userData: Omit<User, 'id' | 'createdAt'>): Omit<User, 'id' | 'createdAt'> => {
    return UserSchema.omit({ id: true, createdAt: true }).parse(userData);
};
