import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available for the factory
const { mockFrom, mockSupabase } = vi.hoisted(() => {
    const mockFrom = vi.fn();
    const mockSupabase = {
        from: mockFrom,
        auth: {
            getUser: vi.fn(),
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
        }
    };
    return { mockFrom, mockSupabase };
});

// Mock dependencies BEFORE importing the app
vi.mock('@/utils/supabase', () => ({
    getSupabaseClient: vi.fn(() => mockSupabase),
    getAuthenticatedClient: vi.fn(() => mockSupabase),
}));

import { getSupabaseClient } from '@/utils/supabase';
import { app } from '@/api/index';

describe('Auth Integration Tests (Mocked DB)', () => {

    const createMockChain = (data: any, error: any = null) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any) => resolve({ data, error }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (getSupabaseClient as any).mockReturnValue(mockSupabase);
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            // Mock Auth SignUp success
            mockSupabase.auth.signUp.mockResolvedValue({
                data: {
                    user: { id: 'new-user-id', email: 'test@example.com' },
                    session: { access_token: 'fake-token' }
                },
                error: null
            });

            // Mock User Profile Check (not found)
            // Mock User Profile Check (not found) and Insert
            mockFrom.mockReturnValue(createMockChain(null));
            // Mock User Profile Insert (success) is handled by default mockResolvedValue in createMockChain for insert

            const res = await app.fetch(
                new Request('http://localhost/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'strongpassword',
                        fullName: 'Test User',
                        userType: 'tourist'
                    }),
                })
            );

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'strongpassword',
                options: {
                    data: {
                        full_name: 'Test User',
                        user_type: 'tourist',
                    }
                }
            });
            // Should verify profile insertion
            expect(mockFrom).toHaveBeenCalledWith('users');
        });

        it('should handle validation errors', async () => {
            const res = await app.fetch(
                new Request('http://localhost/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'invalid-email',
                        password: '123'
                        // Missing fields
                    }),
                })
            );

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Validation failed');
        });

        it('should handle Supabase Auth errors', async () => {
            mockSupabase.auth.signUp.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: 'Email already registered' }
            });

            const res = await app.fetch(
                new Request('http://localhost/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'existing@example.com',
                        password: 'strongpassword',
                        fullName: 'Existing User',
                        userType: 'host'
                    }),
                })
            );

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Email already registered');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully', async () => {
            mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: {
                    session: { access_token: 'valid-token' },
                    user: { id: 'user-id' }
                },
                error: null
            });

            const res = await app.fetch(
                new Request('http://localhost/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'password'
                    }),
                })
            );

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data.session.access_token).toBe('valid-token');
        });

        it('should handle invalid credentials', async () => {
            mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' }
            });

            const res = await app.fetch(
                new Request('http://localhost/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    }),
                })
            );

            expect(res.status).toBe(401);
        });
    });
});
