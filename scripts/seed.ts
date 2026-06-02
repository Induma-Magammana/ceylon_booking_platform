import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Load env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log('🌱 Seeding database...');

    // 1. Create Host
    const { data: host, error: hostError } = await supabase
        .from('users')
        .insert({
            email: 'host@ceylon.lk',
            user_type: 'host',
            full_name: 'Sampath Host',
            country: 'LK' // Added country
        })
        .select()
        .single();

    if (hostError) {
        console.error('Error creating host:', hostError);
        return;
    }
    console.log('✅ Created Host:', host.id);

    // 2. Create Local Tourist
    const { data: localTourist, error: localError } = await supabase
        .from('users')
        .insert({
            email: 'kamal@local.lk',
            user_type: 'tourist',
            full_name: 'Kamal Perera',
            country: 'LK'
        })
        .select()
        .single();

    if (localError) {
        console.error('Error creating local tourist:', localError);
        return;
    }
    console.log('✅ Created Local Tourist:', localTourist.id);

    // 3. Create Foreign Tourist
    const { data: foreignTourist, error: foreignError } = await supabase
        .from('users')
        .insert({
            email: 'john@usa.com',
            user_type: 'tourist',
            full_name: 'John Smith',
            country: 'US'
        })
        .select()
        .single();

    if (foreignError) {
        console.error('Error creating foreign tourist:', foreignError);
        return;
    }
    console.log('✅ Created Foreign Tourist:', foreignTourist.id);

    // 4. Create Listing
    const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
            host_id: host.id,
            title: 'Mirissa Whale Watching',
            description: 'See the blue whales!',
            inventory_type: 'slot',
            location: 'Mirissa',
            local_price: 3500,
            foreign_price: 50,
            capacity: 20
        })
        .select()
        .single();

    if (listingError) {
        console.error('Error creating listing:', listingError);
        return;
    }
    console.log('✅ Created Listing:', listing.id);

    console.log('🎉 Seeding complete!');

    // Save IDs to a temp file for manual testing reference
    const ids = {
        hostId: host.id,
        localTouristId: localTourist.id,
        foreignTouristId: foreignTourist.id,
        listingId: listing.id
    };

    console.log(JSON.stringify(ids, null, 2));
}

seed().catch(console.error);
