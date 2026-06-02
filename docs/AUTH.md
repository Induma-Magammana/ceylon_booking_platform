# Authentication Implementation Plan

## Overview
This document outlines the plan to implement authentication endpoints for the CeylonBooking Platform. We leverage Supabase Auth for identity management and maintain a synchronized `public.users` table for domain-specific user data.

## Endpoints

### 1. Sign Up (`POST /api/auth/signup`)
- **Purpose**: Register a new user and create their profile.
- **Input**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword",
    "fullName": "John Doe",
    "userType": "tourist" // or "host"
  }
  ```
- **Process**:
  1. Call `supabase.auth.signUp()`.
  2. If successful, insert user details into `public.users` table.
     - `id`: from auth.user.id
     - `email`: from input
     - `full_name`: from input
     - `user_type`: from input
  3. Return session/user data.
- **Error Handling**:
  - Email already exists.
  - Invalid input (Zod validation).
  - Database insertion failure (rollback not fully possible without PG triggers, but we will handle gracefully).

### 2. Login (`POST /api/auth/login`)
- **Purpose**: Authenticate a user and receive a session token.
- **Input**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword"
  }
  ```
- **Process**:
  1. Call `supabase.auth.signInWithPassword()`.
  2. Return session (access_token, refresh_token) and user details.

## Implementation Details

### File Structure
- `src/api/auth.ts`: Hono router for auth endpoints.
- `src/api/index.ts`: Mount the auth router.
- `tests/integration/auth.test.ts`: Integration tests.

### Validation
- Use Zod schemas to validate input payloads.

### Security
- Passwords are handled entirely by Supabase (hashed and stored securely).
- Public users table does NOT store passwords.
