import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Create singleton Supabase client for anonymous access
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
    if (!supabaseClient) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
};

export const getAuthenticatedClient = (token: string): SupabaseClient => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

// Database type definitions matching our schema
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    user_type: 'tourist' | 'host';
                    full_name: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    user_type: 'tourist' | 'host';
                    full_name: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    user_type?: 'tourist' | 'host';
                    full_name?: string;
                    created_at?: string;
                };
            };
            listings: {
                Row: {
                    id: string;
                    host_id: string;
                    title: string;
                    description: string | null;
                    inventory_type: 'slot' | 'date';
                    location: string;
                    local_price: number;
                    foreign_price: number;
                    capacity: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    host_id: string;
                    title: string;
                    description?: string | null;
                    inventory_type: 'slot' | 'date';
                    location: string;
                    local_price: number;
                    foreign_price: number;
                    capacity: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    host_id?: string;
                    title?: string;
                    description?: string | null;
                    inventory_type?: 'slot' | 'date';
                    location?: string;
                    local_price?: number;
                    foreign_price?: number;
                    capacity?: number;
                    created_at?: string;
                };
            };
            bookings: {
                Row: {
                    id: string;
                    listing_id: string;
                    tourist_id: string;
                    booking_date: string;
                    time_slot: string | null;
                    quantity: number;
                    total_price: number;
                    currency: 'LKR' | 'USD';
                    status: 'pending' | 'confirmed' | 'cancelled';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    listing_id: string;
                    tourist_id: string;
                    booking_date: string;
                    time_slot?: string | null;
                    quantity: number;
                    total_price: number;
                    currency: 'LKR' | 'USD';
                    status?: 'pending' | 'confirmed' | 'cancelled';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    listing_id?: string;
                    tourist_id?: string;
                    booking_date?: string;
                    time_slot?: string | null;
                    quantity?: number;
                    total_price?: number;
                    currency?: 'LKR' | 'USD';
                    status?: 'pending' | 'confirmed' | 'cancelled';
                    created_at?: string;
                };
            };
        };
    };
}
