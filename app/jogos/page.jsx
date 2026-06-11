"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { scorePick, fmtDT, LOCK_MS, renderFlag } from "@/lib/scoring";
import { Goal, Clock, Lock, Check, CalendarDays, Loader2, Copy } from "lucide-react";

export default function JogosPage() {
  const { user, profile, apelido, loading, supabase, loadProfile } = useApp();
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [picks, setPicks]     = useState({}); // { match_id: {score_a, score_b} }
  const [fetching, setFetching] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("Jogos do dia");
  const [subgrupoAtivo, setSubgrupoAtivo] = useState("Todos");

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading]);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Atualiza as informações do perfil do participante em tempo real a cada refresh de dados para checar status de pix_aprovado
    await loadProfile(user.id);

    const [{ data: ms }, { data: ps }] = await Promise.all([
      supabase.from("matches").select("*").order("match_datetime"),
      supabase.from("picks").select("*").eq("profile_id", user.id),
    ]);
    setMatches(ms ?? []);
    const map = {};
    for (const p of ps ?? []) map[p.match_id] = { score_a: p.score_a, score_b: p.score_b };
    setPicks(map);
    setFetching(false);
  }, [user, supabase, loadProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !user) return <Splash />;

  const savePick = async (matchId, a, b) => {
    const pa = Number(a); const pb = Number(b);

    await supabase.from("picks").upsert(
      { profile_id: user.id, match_id: matchId, score_a: pa, score_b: pb, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,match_id" }
    );
    setPicks((prev) => ({ ...prev, [matchId]: { score_a: pa, score_b: pb } }));
  };

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

  const hoje = new Date();

  const filteredMatches = matches.filter((m) => {
    const dataJogo = new Date(m.match_datetime);

    switch (categoriaAtiva) {
      case 'Jogos do dia':
        return dataJogo.getFullYear() === hoje.getFullYear() &&
               dataJogo.getMonth() === hoje.getMonth() &&
               dataJogo.getDate() === hoje.getDate();
      case 'Todos':
        return true;
      case 'Grupos':
        if (!m.group_name || !m.group_name.startsWith("Grupo")) return false;
        if (subgrupoAtivo === "Todos") return true;
        return m.group_name === `Grupo ${subgrupoAtivo}`;
      case 'fase Mata-Mata':
        return m.group_name && !m.group_name.startsWith("Grupo");
      case 'Oitavas de Final':
        return m.group_name === 'Oitavas';
      case 'Quartas de Final':
        return m.group_name === 'Quartas';
      case 'Semi Final':
        return m.group_name === 'Semifinal';
      case '3º e 4º Lugar':
        return m.group_name === 'Disputa de 3º Lugar';
      case 'Final':
        return m.group_name === 'Final';
      default:
        return true;
    }
  });

  const grouped = groupByPhase(filteredMatches);

  // Calcula quantos jogos de HOJE abertos estão sem palpite
  const missingPicksCount = matches.filter((m) => {
    const kickoffObj = new Date(m.match_datetime);
    const kickoff = kickoffObj.getTime();
    const now = Date.now();
    const locked = now >= kickoff - LOCK_MS;

    const today = new Date();
    const isMatchToday = kickoffObj.getFullYear() === today.getFullYear() &&
                         kickoffObj.getMonth() === today.getMonth() &&
                         kickoffObj.getDate() === today.getDate();

    return isMatchToday && !m.finished && !locked && !picks[m.id];
  }).length;

  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        
        <PageHeader 
          title="Jogos" 
          sub={`Fala, ${apelido}! Hora de mandar seus palpites na Copa.`} 
          icon={<Goal size={22} strokeWidth={2.5} />} 
        />

        {/* Validação de Acesso: Pix Aprovado (Admin tem passe livre) */}
        {(() => {
          const isAdmin = profile?.is_admin || user?.email === 'priscillasantosp24@gmail.com';
          const isLiberado = profile?.pix_aprovado === true || isAdmin;

          return !isLiberado ? (
            <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl animate-fade-in text-center py-12">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/[0.02] rounded-full blur-3xl pointer-events-none" />
            
            <div className="mx-auto w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
              <span className="text-3xl select-none">🔒</span>
            </div>
            
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-4 tracking-tight max-w-xl mx-auto leading-tight">
              🔒 Libere Seus Palpites e Concorra a Prêmios Incríveis!
            </h2>
            <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed font-medium mb-8">
              Ative seu Bolão agora! Faça um Pix de apenas R$10,00 e garanta sua vaga para mostrar quem entende mais de futebol! Envie o comprovante de pagamento ao administrador e seus palpites serão liberados automaticamente.
            </p>
            
            {/* QR Code Simulado Premium */}
            <div className="relative w-36 h-36 mx-auto mb-8 bg-white p-3 rounded-2xl border-2 border-lime-400/30 shadow-[0_0_20px_rgba(163,230,53,0.15)] flex items-center justify-center group hover:scale-105 transition-all duration-300">
              <svg className="w-full h-full text-[#07060f]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="5" y="5" width="20" height="20" rx="2" strokeWidth="3.5" />
                <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                <rect x="75" y="5" width="20" height="20" rx="2" strokeWidth="3.5" />
                <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                <rect x="5" y="75" width="20" height="20" rx="2" strokeWidth="3.5" />
                <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                <path d="M35 5h10M55 5h10M35 15h25M45 25h15" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M75 35h20M75 45h10M85 55h10" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M35 75h10M55 75h25M35 85h30" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M35 35h5v5h-5z M45 45h12v12H45z M62 35h13v5H62z M35 55h5v15h-5z M55 60h10v5H55z M45 65h5v5h-5z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 max-w-md mx-auto space-y-4">
              <div className="py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Chave Pix</span>
                <span className="font-display text-xl sm:text-2xl text-lime-400 select-all font-extrabold tracking-wide">12997380773</span>
              </div>
              <div className="border-t border-white/5 pt-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("12997380773");
                    alert("Chave Pix copiada para a área de transferência!");
                  }}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto text-xs uppercase tracking-wider shadow-lg shadow-yellow-400/10"
                >
                  <Copy size={16} strokeWidth={3} />
                  Copiar Chave Pix
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-white/35 mt-6 font-bold uppercase tracking-wider">
              A liberação é manual e costuma levar menos de 10 minutos!
            </p>
          </div>
          ) : (
          <>
            {/* Alerta de palpites ausentes */}
            {missingPicksCount > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-500/5 animate-pulse">
                <span className="text-base">⚠️</span>
                <span>Atenção: Você tem <b>{missingPicksCount}</b> jogo{missingPicksCount !== 1 ? "s" : ""} aberto{missingPicksCount !== 1 ? "s" : ""} sem palpite! Preencha seus palpites abaixo para pontuar.</span>
              </div>
            )}

            {/* Filtro horizontal de Categorias */}
            {matches.length > 0 && (
               <div className="flex gap-2 overflow-x-auto pb-4 mb-2 -mx-4 px-4 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                 {categorias.map((cat) => {
                   const active = categoriaAtiva === cat;
                   return (
                     <button
                       key={cat}
                       onClick={() => {
                         setCategoriaAtiva(cat);
                         if (cat !== "Grupos") setSubgrupoAtivo("Todos");
                       }}
                       className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-full border transition-all duration-200 ${
                         active 
                           ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] border-lime-400/20 shadow-md shadow-lime-400/10 scale-105" 
                           : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                       }`}
                     >
                       {cat}
                     </button>
                   );
                 })}
               </div>
             )}

            {/* Submenu de Grupos */}
            {categoriaAtiva === "Grupos" && matches.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4 select-none scrollbar-none animate-fade-in">
                {["Todos", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((letra) => {
                  const active = subgrupoAtivo === letra;
                  return (
                    <button
                      key={letra}
                      onClick={() => setSubgrupoAtivo(letra)}
                      className={`whitespace-nowrap px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 border ${
                        active 
                          ? "bg-white/20 text-white border-white/10 shadow-sm" 
                          : "bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {letra === "Todos" ? "Todos" : `Grupo ${letra}`}
                    </button>
                  );
                })}
              </div>
            )}

            {fetching ? (
              <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-lime-400" size={36} /></div>
            ) : matches.length === 0 ? (
              <div className="text-center mt-20 text-white/30 glass-panel rounded-3xl p-10 border border-white/5">
                <CalendarDays size={48} className="mx-auto mb-4 text-white/10" />
                <p className="font-extrabold text-lg text-white/70">Nenhum jogo cadastrado</p>
                <p className="text-sm mt-1 max-w-md mx-auto text-white/40">O administrador do bolão precisa importar os jogos da Copa do Mundo.</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center mt-16 text-white/35 py-10">
                <p className="font-bold">
                  {categoriaAtiva === 'Jogos do dia' 
                    ? "Nenhum jogo agendado para o dia de hoje." 
                    : "Nenhum jogo nesta categoria no momento."}
                </p>
              </div>
            ) : (
              Object.entries(grouped).map(([phase, ms]) => (
                <div key={phase} className="mb-8">
                  <h2 className="font-display text-xl text-gradient-neon mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                    <span>{phase}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-white/40">{ms.length} jogo{ms.length !== 1 ? "s" : ""}</span>
                  </h2>
                  <div className="space-y-4">
                    {ms.map((m) => (
                      <MatchCard key={m.id} match={m} pick={picks[m.id]} onSave={savePick} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
          );
        })()}
      </div>
      <BottomNav />
    </div>
  );
}

function groupByPhase(matches) {
  return matches.reduce((acc, m) => {
    const k = m.group_name || "Copa do Mundo 2026";
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});
}

function MatchCard({ match: m, pick, onSave }) {
  const kickoffObj = new Date(m.match_datetime);
  const kickoff = kickoffObj.getTime();
  const now     = Date.now();
  const locked  = now >= kickoff - LOCK_MS;

  const [a, setA] = useState(pick?.score_a ?? 0);
  const [b, setB] = useState(pick?.score_b ?? 0);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(!pick);

  useEffect(() => { 
    setA(pick?.score_a ?? 0); 
    setB(pick?.score_b ?? 0); 
    setIsEditing(!pick);
  }, [pick?.score_a, pick?.score_b]);

  const pts = m.finished ? scorePick(pick ?? null, m) : null;

  const save = async () => {
    setBusy(true);
    try {
      await onSave(m.id, a, b);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date();
  const isMatchToday = kickoffObj.getFullYear() === today.getFullYear() &&
                       kickoffObj.getMonth() === today.getMonth() &&
                       kickoffObj.getDate() === today.getDate();

  return (
    <div className="glass-panel rounded-3xl p-5 hover:border-white/15 relative overflow-hidden transition-all duration-300">
      {/* Luz interna discreta para match ativo/aberto */}
      {!locked && !m.finished && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-lime-500/[0.03] rounded-full blur-xl pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
          <CalendarDays size={12} className="text-lime-400" /> {fmtDT(m.match_datetime)}
        </span>
        <div className="flex items-center gap-2">
          {!locked && !m.finished && !pick && isMatchToday && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500 text-[#07060f] animate-pulse flex items-center gap-1 shadow-md shadow-amber-500/20">
              ⚠️ Palpitar!
            </span>
          )}
          {m.finished ? (
            <Badge color="emerald">Encerrado</Badge>
          ) : locked ? (
            <Badge color="amber" icon={<Lock size={10} strokeWidth={2.5} />}>Travado</Badge>
          ) : (
            <Badge color="sky" icon={<Clock size={10} strokeWidth={2.5} />}>Aberto</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        {/* Time A */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="h-10 flex items-center justify-center">
            {renderFlag(m.flag_a, "w-14 h-9 object-cover rounded-lg shadow-md border border-white/10 transform hover:scale-110 transition-transform duration-200")}
          </div>
          <span className="font-extrabold text-sm text-center text-white/90">{m.team_a}</span>
          {!locked && !m.finished ? (
            <Stepper value={a} onChange={setA} disabled={!isEditing} />
          ) : (
            <Stepper value={a} onChange={() => {}} disabled={true} />
          )}
        </div>

        <div className="font-display text-white/20 text-3xl select-none">×</div>

        {/* Time B */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="h-10 flex items-center justify-center">
            {renderFlag(m.flag_b, "w-14 h-9 object-cover rounded-lg shadow-md border border-white/10 transform hover:scale-110 transition-transform duration-200")}
          </div>
          <span className="font-extrabold text-sm text-center text-white/90">{m.team_b}</span>
          {!locked && !m.finished ? (
            <Stepper value={b} onChange={setB} disabled={!isEditing} />
          ) : (
            <Stepper value={b} onChange={() => {}} disabled={true} />
          )}
        </div>
      </div>

      {m.finished && (
        <div className="mt-4 flex flex-col items-center justify-center bg-black/40 rounded-xl px-4 py-3 border border-white/5 gap-2">
          <span className="text-sm text-lime-400 font-bold uppercase tracking-wider text-center">
            Resultado Real: <b className="text-white font-display text-base ml-1">{m.team_a} {m.score_a} × {m.score_b} {m.team_b}</b>
          </span>
          <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${pts === 3 ? "text-[#07060f] bg-lime-400 border-lime-400/30 shadow-lg shadow-lime-400/20" : pts === 1 ? "text-lime-300 bg-lime-400/10 border-lime-400/20" : "text-white/30 bg-white/5 border-white/5"}`}>
            {pts === 3 ? "🎯 Cravou +3" : pts === 1 ? "👍 Acertou +1" : "❌ 0 pts"}
          </span>
        </div>
      )}

      {!locked && !m.finished && (
        <div className="mt-4 flex flex-col gap-2">
          {isEditing ? (
            <button onClick={save} disabled={busy}
              className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold py-3 rounded-2xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-lime-400/15 flex items-center justify-center gap-2 disabled:opacity-60 disabled:transform-none">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Confirmar Palpite"}
            </button>
          ) : (
            <div className="flex gap-2.5">
              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-extrabold py-3 rounded-2xl flex items-center justify-center gap-1.5 select-none text-xs uppercase tracking-wider">
                <Check size={14} strokeWidth={3} /> Palpite Confirmado
              </div>
              <button onClick={() => setIsEditing(true)}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-lime-400/25 text-white/70 hover:text-white font-extrabold rounded-2xl transition-all duration-200 text-[10px] uppercase tracking-widest shrink-0">
                Alterar
              </button>
            </div>
          )}
        </div>
      )}
       {locked && !m.finished && !pick && (
        <div className="mt-4 p-2.5 text-center text-xs font-semibold text-amber-300 bg-amber-500/5 border border-amber-500/10 rounded-xl">
          Sem palpite enviado — valerá o placar automático de 0 × 0.
        </div>
      )}
    </div>
  );
}

function Stepper({ value, onChange, disabled }) {
  return (
    <div className={`flex items-center gap-2 mt-1 bg-white/5 p-1 rounded-2xl border border-white/5 shrink-0 max-w-full ${disabled ? "opacity-50" : ""}`}>
      <button onClick={() => !disabled && onChange(Math.max(0, Number(value) - 1))}
        disabled={disabled}
        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-lg transition-all duration-100 disabled:opacity-30">−</button>
      <span className="font-display text-xl text-lime-400 w-5 text-center">{value}</span>
      <button onClick={() => !disabled && onChange(Number(value) + 1)}
        disabled={disabled}
        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-lg transition-all duration-100 disabled:opacity-30">+</button>
    </div>
  );
}

function Badge({ color, icon, children }) {
  const colors = {
    emerald: "text-white/50 bg-white/5 border border-white/5",
    amber:   "text-red-400 bg-red-500/10 border border-red-500/10",
    sky:     "text-lime-300 bg-lime-400/10 border border-lime-400/25",
  };
  return (
    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${colors[color]}`}>
      {icon}{children}
    </span>
  );
}
