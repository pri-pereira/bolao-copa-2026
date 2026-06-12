import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1;       // FIFA World Cup
const WC_SEASON = 2026;

export async function GET(request) {
  // Usa service role para bypassar RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // Proteção: aceita chamadas com o CRON_SECRET correto OU de um usuário admin autenticado
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return Response.json({ error: "Não autenticado." }, { status: 401 });

  let isAuthorized = false;

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    isAuthorized = true;
  } else {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (profileData?.is_admin) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Busca jogos não finalizados com data já passada
    const now = new Date().toISOString();
    const { data: pending, error: dbErr } = await supabase
      .from("matches")
      .select("id, team_a, team_b, api_fixture_id")
      .eq("finished", false)
      .lt("match_datetime", now);

    if (dbErr) throw dbErr;
    if (!pending?.length) return Response.json({ updated: 0, message: "Nenhum jogo pendente." });

    // ====== JANELA DE SINCRONIZAÇÃO INTELIGENTE ======
    const todayStr = new Date().toISOString().split('T')[0];
    
    const { data: todaysMatches, error: todaysErr } = await supabase
      .from("matches")
      .select("match_datetime")
      .gte("match_datetime", `${todayStr}T00:00:00Z`)
      .lte("match_datetime", `${todayStr}T23:59:59.999Z`)
      .order("match_datetime", { ascending: true });

    let shouldFetchApi = true;
    const currentNow = new Date();

    if (todaysErr) console.error("Erro ao buscar jogos do dia no Supabase:", todaysErr);

    if (!todaysMatches || todaysMatches.length === 0) {
      console.log("Sincronização pulada: nenhum jogo agendado para hoje.");
      shouldFetchApi = false;
    } else {
      const firstMatchTime = new Date(todaysMatches[0].match_datetime);
      const lastMatchTime = new Date(todaysMatches[todaysMatches.length - 1].match_datetime);
      const syncWindowEnd = new Date(lastMatchTime.getTime() + 3 * 60 * 60 * 1000);

      if (currentNow < firstMatchTime || currentNow > syncWindowEnd) {
        console.log("Sincronização pulada: fora do horário dos jogos de hoje");
        shouldFetchApi = false;
      }
    }

    if (!shouldFetchApi) {
      return Response.json({ 
        updated: 0, 
        message: "Sincronização pulada: fora da janela de jogos de hoje.",
        checked: pending.length 
      });
    }
    // ====================================================

    let updatedCount = 0;

    const apiKeys = ['4cbbbc82c570738f983ec67bdbf0b28b', 'e33843a4265d83e977e7890d0b4c880a'];
    let data = null;
    let fetchSuccess = false;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const res = await fetch(
        `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&status=FT-AET-PEN`,
        {
          headers: {
            "x-apisports-key": apiKey,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          cache: "no-store",
        }
      );
      
      if (res.status === 429) {
        console.warn(`Cota da chave ${i + 1} excedida (Status 429). Tentando próxima chave...`);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Erro na API-Football: ${res.status} ${res.statusText}`);
      }

      data = await res.json();

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

    // Dicionário de tradução removido para usar cruzamento direto com a API.
    for (const fixture of fixtures) {
      // Tenta encontrar por api_fixture_id primeiro
      let match = pending.find((m) => m.api_fixture_id === fixture.fixture.id);

      // Se não achar por ID, tenta encontrar traduzindo os nomes dos times
      if (!match) {
        const apiHome = fixture.teams.home.name;
        const apiAway = fixture.teams.away.name;

        match = pending.find((m) => 
          m.team_a.toLowerCase() === apiHome.toLowerCase() &&
          m.team_b.toLowerCase() === apiAway.toLowerCase()
        );
      }

      if (!match) continue;

      const scoreA = fixture.goals.home ?? 0;
      const scoreB = fixture.goals.away ?? 0;

      const { error: upErr } = await supabase
        .from("matches")
        .update({ 
          score_a: scoreA, 
          score_b: scoreB, 
          finished: true,
          api_fixture_id: fixture.fixture.id // Vincula para futuras atualizações
        })
        .eq("id", match.id);

      if (!upErr) updatedCount++;
    }

    // 3. Jogos que ainda não puderam ser atualizados
    const { data: stillPending } = await supabase
      .from("matches")
      .select("team_a, team_b")
      .eq("finished", false)
      .lt("match_datetime", now);

    return Response.json({
      updated: updatedCount,
      checked: pending.length,
      fixtures_found: fixtures.length,
      manual_needed: (stillPending ?? []).map((m) => `${m.team_a} × ${m.team_b}`),
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[cron/update-results]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
