const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase
    .from('matches')
    .update({ finished: false, score_a: null, score_b: null })
    .eq('id', 28);
}
run();
