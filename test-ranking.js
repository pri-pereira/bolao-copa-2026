const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://aahmgxjwdfuzvykaabse.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaG1neGp3ZGZ1enZ5a2FhYnNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2MzE1MSwiZXhwIjoyMDk2MjM5MTUxfQ.O6pNny3cAM0Ui_Z--njoyJhkVKxHiR11G1vw4jmrrOA'
);

async function test() {
  const [{ data: profiles }, { data: picks }, { data: matches }] = await Promise.all([
    supabase.from("profiles").select("*").eq("pix_aprovado", true),
    supabase.from("picks").select("*"),
    supabase.from("matches").select("*").order("match_datetime"),
  ]);

  console.log('Finished matches: ', matches.filter(m => m.finished).map(m => ({
    id: m.id, team_a: m.team_a, team_b: m.team_b, score_a: m.score_a, score_b: m.score_b
  })));
  
  if (picks.length > 0) {
    console.log('Sample pick: ', picks[0]);
    console.log('Type of pick.match_id:', typeof picks[0].match_id);
    console.log('Type of match.id:', typeof matches[0].id);
  }
}

test();
