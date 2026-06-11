// api.js

export async function carregarJogosCopa() {
  const URL = '/api/matches-official';

  try {
    const response = await fetch(URL, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Erro ao obter jogos do servidor: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // Converte a propriedade 'data' (string ISO) de volta para objeto Date
    return data.map(jogo => ({
      ...jogo,
      data: new Date(jogo.data)
    }));
  } catch (error) {
    console.error("Erro ao carregar jogos no frontend:", error);
    return [];
  }
}

