import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
  const URL = 'https://api.football-data.org/v4/competitions/WC/matches';

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Chave de API do Football-Data não configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(URL, {
      headers: { 'X-Auth-Token': API_KEY },
      next: { revalidate: 300 } // Cache opcional de 5 minutos no servidor
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    const matches = data.matches.map(jogo => ({
      id: jogo.id,
      data: jogo.utcDate,
      timeCasa: jogo.homeTeam.name || 'A definir',
      timeVisitante: jogo.awayTeam.name || 'A definir',
      status: jogo.status,
      fase: jogo.stage,
      grupo: jogo.group
    }));

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Erro ao carregar jogos na API Route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
