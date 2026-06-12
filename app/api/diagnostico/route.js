import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

export async function GET() {
  const API_KEY = process.env.APIFOOTBALL_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: "APIFOOTBALL_KEY não configurada" }, { status: 500 });
  }

  try {
    // 1. Busca dados crus da API-Football com cache totalmente desabilitado
    const apiRes = await fetch(
      `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": API_KEY,
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": "v3.football.api-sports.io",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: "no-store",
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json({
        error: `API-Football retornou ${apiRes.status}`,
        detalhes: errText,
      }, { status: 500 });
    }

    const apiData = await apiRes.json();
    const allFixtures = apiData.response ?? [];

    // Filtra jogos com status FT (Full Time), AET (After Extra Time), PEN (Penalties)
    const finishedFromAPI = allFixtures
      .filter((f) => ["FT", "AET", "PEN"].includes(f.fixture.status.short))
      .map((f) => ({
        fixtureId: f.fixture.id,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        goalsHome: f.goals.home,
        goalsAway: f.goals.away,
        status: f.fixture.status.short,
        statusLong: f.fixture.status.long,
        date: f.fixture.date,
      }));

    // Pega o jogo do México especificamente (se existir)
    const mexicoGame = allFixtures.find(
      (f) =>
        f.teams.home.name?.toLowerCase().includes("mexico") ||
        f.teams.away.name?.toLowerCase().includes("mexico")
    );

    // 2. Busca dados do Supabase para comparar
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: dbMatches } = await supabase
      .from("matches")
      .select("id, team_a, team_b, score_a, score_b, finished, api_fixture_id")
      .order("match_datetime");

    const dbFinished = (dbMatches ?? []).filter((m) => m.finished);
    const dbPending = (dbMatches ?? []).filter((m) => !m.finished);

    // Busca o México no Supabase
    const mexicoDB = (dbMatches ?? []).find(
      (m) =>
        m.team_a?.toLowerCase().includes("méx") ||
        m.team_b?.toLowerCase().includes("méx") ||
        m.team_a?.toLowerCase().includes("mex") ||
        m.team_b?.toLowerCase().includes("mex")
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      api_source: "API-Football (v3.football.api-sports.io)",
      api_football: {
        total_jogos: allFixtures.length,
        finalizados: finishedFromAPI.length,
        jogos_finalizados: finishedFromAPI,
        mexico_raw: mexicoGame
          ? {
              fixtureId: mexicoGame.fixture.id,
              homeTeam: mexicoGame.teams.home.name,
              awayTeam: mexicoGame.teams.away.name,
              goalsHome: mexicoGame.goals.home,
              goalsAway: mexicoGame.goals.away,
              status: mexicoGame.fixture.status.short,
              statusLong: mexicoGame.fixture.status.long,
            }
          : "NÃO ENCONTRADO NA API",
      },
      supabase_db: {
        total_jogos: (dbMatches ?? []).length,
        finalizados_no_db: dbFinished.length,
        pendentes_no_db: dbPending.length,
        mexico_no_db: mexicoDB ?? "NÃO ENCONTRADO NO SUPABASE",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
