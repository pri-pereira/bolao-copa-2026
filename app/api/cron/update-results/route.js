import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID     = 1;    // FIFA World Cup na API-Football
const WC_SEASON        = 2026;

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

    let updatedCount = 0;

    // 2. Busca todos os jogos finalizados da Copa 2026 de uma vez (mais eficiente)
    const res = await fetch(
      `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&status=FT-AET-PEN`,
      { headers: { "x-apisports-key": process.env.APIFOOTBALL_KEY } }
    );
    const data = await res.json();
    const fixtures = data.response ?? [];

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

    for (const fixture of fixtures) {
      // Tenta encontrar por api_fixture_id primeiro
      let match = pending.find((m) => m.api_fixture_id === fixture.fixture.id);

      // Se não achar por ID, tenta encontrar traduzindo os nomes dos times
      if (!match) {
        const apiHome = fixture.teams.home.name;
        const apiAway = fixture.teams.away.name;

        match = pending.find((m) => {
          const dbHomeMapped = TEAM_MAP[m.team_a] || m.team_a;
          const dbAwayMapped = TEAM_MAP[m.team_b] || m.team_b;

          return (
            dbHomeMapped.toLowerCase() === apiHome.toLowerCase() &&
            dbAwayMapped.toLowerCase() === apiAway.toLowerCase()
          );
        });
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
      manual_needed: (stillPending ?? []).map((m) => `${m.team_a} × ${m.team_b}`),
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[cron/update-results]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
