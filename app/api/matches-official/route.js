import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1;       // FIFA World Cup
const WC_SEASON = 2026;

// Dicionário de tradução removido para usar cruzamento direto com a API.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  try {
    // Instancia o cliente do SupabaseAdmin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ====== 1. JANELA DE SINCRONIZAÇÃO INTELIGENTE ======
    // O parâmetro 'date' normalmente vem como YYYY-MM-DD
    const todayStr = dateParam || new Date().toISOString().split('T')[0];
    
    // Busca os jogos do dia no Supabase
    const { data: todaysMatches, error: todaysErr } = await supabaseAdmin
      .from("matches")
      .select("match_datetime")
      .gte("match_datetime", `${todayStr}T00:00:00Z`)
      .lte("match_datetime", `${todayStr}T23:59:59.999Z`)
      .order("match_datetime", { ascending: true });

    let shouldFetchApi = true;
    const now = new Date();

    if (todaysErr) {
      console.error("Erro ao buscar jogos do dia no Supabase:", todaysErr);
    }

    if (!todaysMatches || todaysMatches.length === 0) {
      console.log("Sincronização pulada: nenhum jogo agendado para hoje.");
      shouldFetchApi = false;
    } else {
      // Calcula o horário do primeiro e do último jogo
      const firstMatchTime = new Date(todaysMatches[0].match_datetime);
      const lastMatchTime = new Date(todaysMatches[todaysMatches.length - 1].match_datetime);
      
      // Janela de término = Último Jogo + 3 horas
      const syncWindowEnd = new Date(lastMatchTime.getTime() + 3 * 60 * 60 * 1000);

      // Condicional de execução
      if (now < firstMatchTime || now > syncWindowEnd) {
        console.log("Sincronização pulada: fora do horário dos jogos de hoje");
        shouldFetchApi = false;
      }
    }

    // Se estiver fora da janela, retorna array vazio (o frontend já usa os dados locais do Supabase)
    if (!shouldFetchApi) {
      return NextResponse.json([]);
    }
    // ====================================================

    let url = `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`;
    if (dateParam) {
      url += `&date=${dateParam}`;
    }

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
            
            const isFlexMatch = (dbName, apiN) => {
              const d = dbName.toLowerCase();
              const a = apiN.toLowerCase();
              if (d === a) return true;
              if (d.includes("korea") && a.includes("korea")) return true;
              if (d.includes("czech") && a.includes("czech")) return true;
              return d.includes(a) || a.includes(d);
            };

            matchDb = pendingDb.find(m => isFlexMatch(m.team_a, apiHome) && isFlexMatch(m.team_b, apiAway));
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
