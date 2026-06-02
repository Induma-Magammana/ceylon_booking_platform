import { describe, it, expect } from 'vitest';
import { User, UserSchema, UserType } from '@/domain/User';

describe('User Domain Model', () => {
    describe('User Creation', () => {
        it('should create a valid tourist user', () => {
            const userData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'tourist@example.com',
                userType: 'tourist' as UserType,
                fullName: 'John Doe',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.userType).toBe('tourist');
            }
        });

        it('should create a valid host user', () => {
            const userData = {
                id: '223e4567-e89b-12d3-a456-426614174001',
                email: 'host@example.com',
                userType: 'host' as UserType,
                fullName: 'Jane Smith',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.userType).toBe('host');
            }
        });

        it('should reject invalid email format', () => {
            const userData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'invalid-email',
                userType: 'tourist' as UserType,
                fullName: 'John Doe',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid user type', () => {
            const userData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                userType: 'invalid-type',
                fullName: 'John Doe',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(false);
        });

        it('should reject empty email', () => {
            const userData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: '',
                userType: 'tourist' as UserType,
                fullName: 'John Doe',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(false);
        });

        it('should reject empty full name', () => {
            const userData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                userType: 'tourist' as UserType,
                fullName: '',
                createdAt: new Date(),
            };

            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(false);
        });
    });
});
