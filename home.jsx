import React, { useState, useEffect } from 'react';
import { carregarJogosCopa } from './test-api'; // Ajustado para ler do seu arquivo test-api.js
import { jogosDeTesteMock } from './jogosTeste'; // Importe os jogos de teste

export default function Home() {
  const [todosOsJogos, setTodosOsJogos] = useState([]);
  const [jogosFiltrados, setJogosFiltrados] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Jogos do dia');

  // CHAVE LIGA/DESLIGA: Mude para false para voltar para a Copa Oficial
  const MODO_TESTE = true; 

  const categorias = [
    'Jogos do dia', 
    'Todos', 
    'Grupos', 
    'fase Mata-Mata', 
    'Oitavas de Final', 
    'Quartas de Final', 
    'Semi Final', 
    '3º e 4º Lugar', 
    'Final'
  ];

  useEffect(() => {
    async function iniciar() {
      if (MODO_TESTE) {
        // Se o modo teste estiver ativo, carrega os jogos falsos de hoje
        setTodosOsJogos(jogosDeTesteMock);
      } else {
        // Caso contrário, carrega os 104 jogos oficiais da API da Copa
        const lista = await carregarJogosCopa();
        setTodosOsJogos(lista);
      }
    }
    iniciar();
  }, [MODO_TESTE]);

  useEffect(() => {
    const hoje = new Date().toLocaleDateString('pt-BR');

    // Lógica para filtrar os jogos baseado na categoria selecionada
    const filtrar = todosOsJogos.filter(jogo => {
      const dataJogoFormatada = jogo.data.toLocaleDateString('pt-BR');

      switch (categoriaAtiva) {
        case 'Jogos do dia':
          return dataJogoFormatada === hoje; // Exibe somente os jogos de hoje
        case 'Todos':
          return true;
        case 'Grupos':
          return jogo.fase === 'GROUP_STAGE';
        case 'fase Mata-Mata':
          // Retorna qualquer jogo que não seja da fase de grupos
          return jogo.fase !== 'GROUP_STAGE';
        case 'Oitavas de Final':
          return jogo.fase === 'LAST_16';
        case 'Quartas de Final':
          return jogo.fase === 'QUARTER_FINALS';
        case 'Semi Final':
          return jogo.fase === 'SEMI_FINALS';
        case '3º e 4º Lugar':
          return jogo.fase === 'THIRD_PLACE';
        case 'Final':
          return jogo.fase === 'FINAL';
        default:
          return true;
      }
    });

    setJogosFiltrados(filtrar);
  }, [categoriaAtiva, todosOsJogos]);

  return (
    <div className="container-home">
      {/* Menu de Categorias Reorganizado */}
      <nav className="menu-categorias">
        {categorias.map(cat => (
          <button 
            key={cat} 
            className={categoriaAtiva === cat ? 'active' : ''} 
            onClick={() => setCategoriaAtiva(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* Lista de Jogos Exibidos */}
      <section className="lista-jogos">
        <h2>{categoriaAtiva}</h2>
        {jogosFiltrados.length === 0 ? (
          <p>Nenhum jogo encontrado para esta categoria hoje.</p>
        ) : (
          jogosFiltrados.map(jogo => (
            <div key={jogo.id} className="card-jogo">
              <span>{jogo.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="confronto">
                {jogo.timeCasa} x {jogo.timeVisitante}
              </div>
              <span className={`status ${jogo.status.toLowerCase()}`}>
                {jogo.status === 'TIMED' ? 'Agendado' : jogo.status === 'IN_PLAY' ? 'Ao Vivo' : 'Finalizado'}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
