const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('matches')
    .update({ finished: true, score_a: 2, score_b: 0 })
    .ilike('team_a', '%Méx%')
    .select();

  console.log('Update result:', data, error);
}
run();
