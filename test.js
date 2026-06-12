const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^#\n]+)/)[1].replace(/['"]/g, '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const [{ data: profiles }, { data: picks }, { data: matches, error }] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('picks').select('*'),
    supabase.from('matches').select('*')
  ]);
  
  if (error) console.error(error);
  
  const finished = (matches || []).filter(m => m.finished);
  console.log('Matches finalizados:', finished.length);
  if (finished.length > 0) {
     console.log('Exemplo finalizado:', finished[0].team_a, finished[0].score_a, finished[0].team_b, finished[0].score_b);
  }
  
  for (const profile of profiles || []) {
    const userPicks = (picks || []).filter((p) => p.profile_id === profile.id);
    let points = profile.points_offset || 0;
    
    for (const match of finished) {
      const pick = userPicks.find((p) => p.match_id === match.id);
      
      const pa = pick ? Number(pick.score_a) : 0;
      const pb = pick ? Number(pick.score_b) : 0;
      const ma = Number(match.score_a);
      const mb = Number(match.score_b);

      let pts = 0;
      if (pa === ma && pb === mb) pts = 3;
      else {
        const pickOutcome  = Math.sign(pa - pb);
        const matchOutcome = Math.sign(ma - mb);
        if (pickOutcome === matchOutcome) pts = 1;
      }
      
      if (pts > 0) {
        console.log(`Perfil ${profile.apelido} ganhou ${pts} pts no jogo ${match.team_a} x ${match.team_b}`);
      }
      points += pts;
    }
    console.log(`Perfil ${profile.apelido}: Total pts: ${points}`);
  }
}
run();
