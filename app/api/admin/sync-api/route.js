import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1;       // FIFA World Cup
const WC_SEASON = 2026;

const TEAM_MAP = {
  "Brasil": "Brazil", "Alemanha": "Germany", "Espanha": "Spain", "Argentina": "Argentina",
  "França": "France", "Bélgica": "Belgium", "Holanda": "Netherlands", "Inglaterra": "England",
  "Portugal": "Portugal", "Uruguai": "Uruguay", "Croácia": "Croatia", "México": "Mexico",
  "Estados Unidos": "USA", "Canadá": "Canada", "Japão": "Japan", "Coreia do Sul": "South Korea",
  "Austrália": "Australia", "Marrocos": "Morocco", "Senegal": "Senegal", "Gana": "Ghana",
  "Colômbia": "Colombia", "Equador": "Ecuador", "Suíça": "Switzerland", "Suécia": "Sweden",
  "Noruega": "Norway", "Áustria": "Austria", "Irã": "Iran", "Arábia Saudita": "Saudi Arabia",
  "Catar": "Qatar", "Egito": "Egypt", "Turquia": "Turkey", "República Tcheca": "Czech Republic",
  "Escócia": "Scotland", "África do Sul": "South Africa", "Bósnia & Herzegovina": "Bosnia and Herzegovina",
  "Haiti": "Haiti", "Paraguai": "Paraguay", "Curaçao": "Curaçao", "Costa do Marfim": "Ivory Coast",
  "Tunísia": "Tunisia", "Nova Zelândia": "New Zealand", "Cabo Verde": "Cape Verde",
  "Iraque": "Iraq", "Argélia": "Algeria", "Jordânia": "Jordan", "R. D. do Congo": "DR Congo",
  "Uzbequistão": "Uzbekistan", "Panamá": "Panama",
};

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Autorização do Admin
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  
  if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profileData?.is_admin && user.email !== 'priscillasantosp24@gmail.com') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const url = `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`;
    const apiKeys = ['4cbbbc82c570738f983ec67bdbf0b28b', 'e33843a4265d83e977e7890d0b4c880a'];
    let data = null;
    let fetchSuccess = false;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey,
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "v3.football.api-sports.io",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: 'no-store',
      });
      
      if (response.status === 429) {
        console.warn(`Cota da chave ${i + 1} excedida (Status 429). Tentando próxima chave...`);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Erro na API-Football: ${response.status} ${response.statusText}`);
      }
      
      data = await response.json();
      
      if (data.errors && data.errors.requests) {
        console.warn(`Cota da chave ${i + 1} excedida (Limite API). Tentando próxima chave...`);
        continue;
      }
      
      fetchSuccess = true;
      break;
    }

    if (!fetchSuccess || !data) {
      throw new Error("Todas as chaves da API-Football excederam o limite de cota.");
    }
    
    const fixtures = data.response ?? [];

    const finishedFixtures = fixtures.filter(f => ["FT", "AET", "PEN"].includes(f.fixture.status.short));
    let updatedCount = 0;

    if (finishedFixtures.length > 0) {
      // Pega todos os jogos no banco que ainda não estão finalizados
      const { data: pendingDb } = await supabase
        .from("matches")
        .select("id, team_a, team_b, api_fixture_id")
        .eq("finished", false);

      if (pendingDb && pendingDb.length > 0) {
        for (const fixture of finishedFixtures) {
          let matchDb = pendingDb.find(m => m.api_fixture_id === fixture.fixture.id);
          
          if (!matchDb) {
            const apiHome = fixture.teams.home.name;
            const apiAway = fixture.teams.away.name;
            matchDb = pendingDb.find(m => {
              const dbHomeMapped = TEAM_MAP[m.team_a] || m.team_a;
              const dbAwayMapped = TEAM_MAP[m.team_b] || m.team_b;
              return (
                dbHomeMapped.toLowerCase() === apiHome?.toLowerCase() &&
                dbAwayMapped.toLowerCase() === apiAway?.toLowerCase()
              );
            });
          }

          if (matchDb) {
            const { error: upErr } = await supabase
              .from("matches")
              .update({ 
                score_a: fixture.goals.home ?? 0, 
                score_b: fixture.goals.away ?? 0, 
                finished: true,
                api_fixture_id: fixture.fixture.id
              })
              .eq("id", matchDb.id);
              
            if (!upErr) updatedCount++;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updatedCount} jogos atualizados e marcados como finalizados.`,
      updatedCount 
    });
  } catch (error) {
    console.error("Erro no sync manual da API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
