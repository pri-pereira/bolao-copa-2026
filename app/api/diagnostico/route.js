import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY não configurada" }, { status: 500 });
  }

  try {
    // 1. Busca dados crus da API football-data.org com cache totalmente desabilitado
    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      {
        method: "GET",
        headers: {
          "X-Auth-Token": API_KEY,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: "no-store",
        next: { revalidate: 0 },
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json({
        error: `API retornou ${apiRes.status}`,
        detalhes: errText,
      }, { status: 500 });
    }

    const apiData = await apiRes.json();
    const allMatches = apiData.matches ?? [];

    // Filtra jogos FINISHED da API
    const finishedFromAPI = allMatches
      .filter((m) => m.status === "FINISHED")
      .map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam?.name,
        awayTeam: m.awayTeam?.name,
        scoreHome: m.score?.fullTime?.home,
        scoreAway: m.score?.fullTime?.away,
        status: m.status,
        utcDate: m.utcDate,
      }));

    // Pega o jogo do México especificamente (se existir)
    const mexicoGame = allMatches.find(
      (m) =>
        m.homeTeam?.name?.toLowerCase().includes("mexico") ||
        m.awayTeam?.name?.toLowerCase().includes("mexico") ||
        m.homeTeam?.name?.toLowerCase().includes("méxico") ||
        m.awayTeam?.name?.toLowerCase().includes("méxico")
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
      api_football_data: {
        total_jogos: allMatches.length,
        finalizados: finishedFromAPI.length,
        jogos_finalizados: finishedFromAPI,
        mexico_raw: mexicoGame
          ? {
              id: mexicoGame.id,
              homeTeam: mexicoGame.homeTeam?.name,
              awayTeam: mexicoGame.awayTeam?.name,
              scoreHome: mexicoGame.score?.fullTime?.home,
              scoreAway: mexicoGame.score?.fullTime?.away,
              status: mexicoGame.status,
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
