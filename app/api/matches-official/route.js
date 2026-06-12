import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1;       // FIFA World Cup
const WC_SEASON = 2026;

export async function GET() {
  const API_KEY = process.env.APIFOOTBALL_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Chave da API-Football (APIFOOTBALL_KEY) não configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      {
        headers: {
          "x-apisports-key": API_KEY,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Erro na API-Football: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const fixtures = data.response ?? [];

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

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Erro ao carregar jogos na API Route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
