"use client";
import React, { useState, useEffect } from 'react';
import { carregarJogosCopa } from '../api'; 
import { jogosDeTesteMock } from '../jogosTeste'; 
import { Trophy, Loader2, CalendarDays } from "lucide-react";

export default function Home() {
  const [todosOsJogos, setTodosOsJogos] = useState([]);
  const [jogosFiltrados, setJogosFiltrados] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Jogos do dia');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 2. CHAVE LIGA/DESLIGA: Mude para false para voltar para a Copa Oficial
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

  // Garantir que a renderização de datas e horários só ocorra no cliente para evitar Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function iniciar() {
      setLoading(true);
      try {
        if (MODO_TESTE) {
          setTodosOsJogos(jogosDeTesteMock);
        } else {
          const lista = await carregarJogosCopa();
          setTodosOsJogos(lista);
        }
      } catch (err) {
        console.error("Erro no carregamento:", err);
      } finally {
        setLoading(false);
      }
    }
    iniciar();
  }, [MODO_TESTE]);

  useEffect(() => {
    if (!mounted) return;

    const hoje = new Date().toLocaleDateString('pt-BR');

    // Lógica para filtrar os jogos baseado na categoria selecionada
    const filtrar = todosOsJogos.filter(jogo => {
      const dataJogo = jogo.data instanceof Date ? jogo.data : new Date(jogo.data);
      const dataJogoFormatada = dataJogo.toLocaleDateString('pt-BR');

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
  }, [categoriaAtiva, todosOsJogos, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07060f]">
        <Loader2 className="animate-spin text-lime-400" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        
        {/* Header */}
        <header className="pt-8 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 mb-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-[#07060f] flex items-center justify-center shadow-[0_0_25px_rgba(163,230,53,0.2)]">
              <Trophy size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl text-white leading-none tracking-tight">COPA 2026</h1>
              <p className="text-white/50 text-xs font-medium mt-1">Painel Geral de Jogos</p>
            </div>
          </div>
          {MODO_TESTE && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500 text-[#07060f] animate-pulse">
              Modo Teste Ativo
            </span>
          )}
        </header>

        {/* Menu de Categorias */}
        <nav className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {categorias.map(cat => (
            <button 
              key={cat} 
              className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-full border transition-all duration-200 ${
                categoriaAtiva === cat 
                  ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] border-lime-400/20 shadow-md shadow-lime-400/10 scale-105" 
                  : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setCategoriaAtiva(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Lista de Jogos */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-gradient-neon mb-4 border-b border-white/5 pb-2">
            {categoriaAtiva}
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-lime-400" size={36} />
            </div>
          ) : jogosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-white/30 glass-panel rounded-3xl p-10 border border-white/5">
              <p className="font-extrabold text-lg text-white/70">Nenhum jogo encontrado</p>
              <p className="text-sm mt-1 max-w-sm mx-auto text-white/40">Não há partidas nesta categoria no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {jogosFiltrados.map(jogo => {
                const dataJogo = jogo.data instanceof Date ? jogo.data : new Date(jogo.data);
                
                let badgeColor = "sky";
                let statusLabel = "Agendado";
                if (jogo.status === "IN_PLAY") {
                  badgeColor = "amber";
                  statusLabel = "Ao Vivo";
                } else if (jogo.status === "FINISHED") {
                  badgeColor = "emerald";
                  statusLabel = "Finalizado";
                }

                const badgeColors = {
                  emerald: "text-white/50 bg-white/5 border border-white/5",
                  amber:   "text-red-400 bg-red-500/10 border border-red-500/10 animate-pulse",
                  sky:     "text-lime-300 bg-lime-400/10 border border-lime-400/25",
                };

                return (
                  <div key={jogo.id} className="glass-panel rounded-3xl p-5 hover:border-white/15 relative overflow-hidden transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <CalendarDays size={12} className="text-lime-400" />
                        {mounted 
                          ? dataJogo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                          : '--:--'}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badgeColors[badgeColor]}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="font-extrabold text-sm text-center text-white/90">{jogo.timeCasa}</span>
                      </div>
                      <div className="font-display text-white/20 text-3xl select-none">×</div>
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="font-extrabold text-sm text-center text-white/90">{jogo.timeVisitante}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07060f]">
      <Loader2 className="animate-spin text-lime-400" size={40} />
    </div>
  );
}

export function BgFx() {
  return (
    <>
      {/* Grade futurista de estádio */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "repeating-linear-gradient(90deg,#a3e635 0 1px,transparent 1px 60px), repeating-linear-gradient(0deg,#a3e635 0 1px,transparent 1px 60px)",
      }} />
      {/* Luzes difusas de estádio */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: "radial-gradient(1000px 500px at 80% -10%,rgba(139,92,246,0.18),transparent), radial-gradient(800px 400px at 0% 110%,rgba(163,230,53,0.12),transparent)",
      }} />
    </>
  );
}
