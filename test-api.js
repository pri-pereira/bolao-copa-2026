// test-api.js
const API_KEY = process.env.FOOTBALL_DATA_API_KEY; // Obtida de variáveis de ambiente

export async function carregarJogosCopa() {
  const URL = 'https://api.football-data.org/v4/competitions/WC/matches';

  if (!API_KEY) {
    console.warn("Aviso: FOOTBALL_DATA_API_KEY não configurada no ambiente.");
  }

  try {
    const response = await fetch(URL, {
      headers: API_KEY ? { 'X-Auth-Token': API_KEY } : {}
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // 1ª Substituição: Lendo 'data.matches' em vez de 'data.response'
    return data.matches.map(jogo => ({
      id: jogo.id,
      data: new Date(jogo.utcDate),
      // 2ª Substituição: Lendo 'homeTeam.name' e 'awayTeam.name'
      timeCasa: jogo.homeTeam.name || 'A definir',
      timeVisitante: jogo.awayTeam.name || 'A definir',
      // 3ª Substituição: Mapeando os novos Status
      status: jogo.status, // TIMED, IN_PLAY, FINISHED
      fase: jogo.stage, // A API retorna a fase aqui (ex: GROUP_STAGE, LAST_16, etc.)
      grupo: jogo.group
    }));
  } catch (error) {
    console.error("Erro ao carregar jogos:", error);
    return [];
  }
}
