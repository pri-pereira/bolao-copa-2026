// test-api.js
const API_KEY = '444eb186107a475f910f9e3da420f970'; // Chave da API Football-Data.org

export async function carregarJogosCopa() {
  const URL = 'https://api.football-data.org/v4/competitions/WC/matches';

  try {
    const response = await fetch(URL, {
      headers: { 'X-Auth-Token': API_KEY }
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