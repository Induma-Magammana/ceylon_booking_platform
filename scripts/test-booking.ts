import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Load env vars
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testBooking() {
    console.log('🧪 Testing Booking Flow...');

    // 1. Get Data
    const { data: localUser } = await supabase.from('users').select('id').eq('email', 'kamal@local.lk').single();
    const { data: listing } = await supabase.from('listings').select('id').eq('title', 'Mirissa Whale Watching').single();

    if (!localUser || !listing) {
        console.error('❌ Missing seed data. Run seed.ts first.');
        return;
    }

    // 2. Make Request
    console.log('Sending booking request...');
    const response = await fetch('http://127.0.0.1:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            listingId: listing.id,
            touristId: localUser.id,
            bookingDate: '2026-03-01',
            timeSlot: '08:00:00',
            quantity: 2
        })
    });

    const result = await response.json();

    if (response.ok) {
        console.log('✅ Booking Successful!');
        console.log('Booking ID:', result.bookingId);
        console.log('Price:', result.price);

        if (result.price.currency === 'LKR' && result.price.totalPrice === 7000) {
            console.log('✅ Pricing Logic Verified (LKR 3500 * 2 = 7000)');
        } else {
            console.error('❌ Pricing Logic FAILED:', result.price);
        }
    } else {
        console.error('❌ Booking Failed:', result);
    }
}

testBooking().catch(console.error);
