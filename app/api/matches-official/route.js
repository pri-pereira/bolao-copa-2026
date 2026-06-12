import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APIFOOTBALL_BASE = "https://v3.api-football.com";
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

export async function GET(request) {
  const API_KEY = process.env.APIFOOTBALL_KEY;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Chave da API-Football (APIFOOTBALL_KEY) não configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    let url = `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`;
    if (dateParam) {
      url += `&date=${dateParam}`;
    }

    const response = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API-Football: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const fixtures = data.response ?? [];

    // Formata o retorno para o client
    const matches = fixtures.map(item => ({
      id: item.fixture.id,
      data: item.fixture.date,
      timeCasa: item.teams.home.name || 'A definir',
      timeVisitante: item.teams.away.name || 'A definir',
      status: item.fixture.status.short,          // "FT", "NS", "1H", "2H", etc.
      statusLongo: item.fixture.status.long,       // "Match Finished", "Not Started", etc.
      golsCasa: item.goals.home,
      golsVisitante: item.goals.away,
      fase: item.league.round,
    }));

    // ====== ATUALIZAÇÃO AUTOMÁTICA NO SUPABASE ======
    // Se a API retornou jogos finalizados, garante que eles estejam atualizados no Supabase.
    const finishedFixtures = fixtures.filter(f => ["FT", "AET", "PEN"].includes(f.fixture.status.short));
    
    if (finishedFixtures.length > 0) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Busca os jogos pendentes no banco local para ver se precisamos atualizar
      const { data: pendingDb } = await supabaseAdmin
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
            // Atualiza no banco!
            await supabaseAdmin
              .from("matches")
              .update({ 
                score_a: fixture.goals.home ?? 0, 
                score_b: fixture.goals.away ?? 0, 
                finished: true,
                api_fixture_id: fixture.fixture.id
              })
              .eq("id", matchDb.id);
          }
        }
      }
    }

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Erro ao carregar jogos na API Route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
