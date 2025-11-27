const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,  // ← Use service key instead of anon key
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

module.exports = supabase;
