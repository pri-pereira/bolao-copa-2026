"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { scorePick, getRandomEmoji, fmtDT, renderFlag } from "@/lib/scoring";
import { Users, Lock, CalendarDays, Loader2, Info } from "lucide-react";

export default function PalpitesPage() {
  const { user, profile, apelido, loading, supabase } = useApp();
  const router = useRouter();
  
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    const [{ data: ms }, { data: ps }, { data: prfs }] = await Promise.all([
      supabase.from("matches").select("*").order("match_datetime"),
      supabase.from("picks").select("*"),
      supabase.from("profiles").select("*")
    ]);
    
    setMatches(ms ?? []);
    setPicks(ps ?? []);
    setProfiles(prfs ?? []);
    setFetching(false);
  }, [user, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const hoje = new Date();
  
  // Filtrar apenas jogos do dia
  const matchesHoje = useMemo(() => {
    return matches.filter(m => {
      const dataJogo = new Date(m.match_datetime);
      return dataJogo.getFullYear() === hoje.getFullYear() &&
             dataJogo.getMonth() === hoje.getMonth() &&
             dataJogo.getDate() === hoje.getDate();
    });
  }, [matches]);

  if (loading || !user) return <Splash />;



  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        <PageHeader 
          title="Palpites da Galera" 
          sub="Confira as apostas dos participantes nos jogos de hoje" 
          icon={<Users size={22} strokeWidth={2.5} />} 
        />

        {fetching ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-lime-400" size={36} /></div>
        ) : matchesHoje.length === 0 ? (
          <div className="text-center mt-20 text-white/30 glass-panel rounded-3xl p-10 border border-white/5">
            <CalendarDays size={48} className="mx-auto mb-4 text-white/10" />
            <p className="font-extrabold text-lg text-white/70">Nenhum jogo hoje</p>
            <p className="text-sm mt-1 max-w-md mx-auto text-white/40">Não há partidas agendadas para o dia de hoje.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 text-blue-300 text-xs font-semibold">
              <Info size={18} className="shrink-0 mt-0.5" />
              <p>Por questões de integridade, os palpites dos adversários só são revelados <b>10 minutos após</b> o início de cada partida.</p>
            </div>

            {matchesHoje.map((m) => (
              <MatchPalpitesCard 
                key={m.id} 
                match={m} 
                profiles={profiles} 
                picks={picks} 
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function MatchPalpitesCard({ match, profiles, picks }) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // atualiza a cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  const kickoffObj = new Date(match.match_datetime);
  const kickoff = kickoffObj.getTime();
  const isRevealed = now >= kickoff + 10 * 60 * 1000;

  const matchPicks = useMemo(() => {
    const validProfiles = profiles.filter(p => p.pix_aprovado === true || p.is_admin === true || p.email === 'priscillasantosp24@gmail.com');
    return validProfiles.map(p => {
      const pick = picks.find(pk => pk.profile_id === p.id && pk.match_id === match.id);
      const score_a = pick ? pick.score_a : 0;
      const score_b = pick ? pick.score_b : 0;
      
      let emoji = "";
      let statusText = "";
      let points = null;
      
      const pts = scorePick(pick ? { score_a, score_b } : null, match);
      if (pts !== null) {
        points = pts;
        emoji = getRandomEmoji(pts);
        if (pts === 3) statusText = "cravei! 3+ pontos";
        else if (pts === 1) statusText = "acertei 1+ ponto";
        else statusText = "0 pts";
      }

      return {
        profile: p,
        score_a,
        score_b,
        emoji,
        statusText,
        points
      };
    }).sort((a, b) => (a.profile.apelido || "").localeCompare(b.profile.apelido || ""));
  }, [profiles, picks, match]);

  return (
    <div className="glass-panel rounded-3xl p-5 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <CalendarDays size={12} className="text-lime-400" /> {fmtDT(match.match_datetime)}
        </span>
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex-1 flex flex-col items-end gap-1">
            {renderFlag(match.flag_a, "w-10 h-7 object-cover rounded shadow-md border border-white/10")}
            <span className="font-extrabold text-xs text-white/90 text-right">{match.team_a}</span>
          </div>
          <div className="font-display text-white/20 text-xl select-none">×</div>
          <div className="flex-1 flex flex-col items-start gap-1">
            {renderFlag(match.flag_b, "w-10 h-7 object-cover rounded shadow-md border border-white/10")}
            <span className="font-extrabold text-xs text-white/90 text-left">{match.team_b}</span>
          </div>
        </div>
      </div>

      {!isRevealed ? (
        <div className="bg-black/30 border border-white/5 rounded-2xl p-6 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 flex items-center justify-center mb-3">
            <Lock size={20} />
          </div>
          <p className="text-white/60 text-sm font-semibold mb-1">Palpites Ocultos</p>
          <p className="text-white/40 text-xs max-w-xs">
            As apostas serão reveladas 10 minutos após o apito inicial.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {matchPicks.length === 0 ? (
            <p className="text-center text-xs text-white/40 py-4">Nenhum participante apto.</p>
          ) : (
            matchPicks.map((mp) => (
              <div key={mp.profile.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={`/avatares/${mp.profile.avatar || "1889-hamster2.png"}`} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10 object-cover bg-[#0a0816]" />
                  <span className="text-xs font-bold text-white/80 flex items-center gap-1.5 flex-wrap">
                    {mp.profile.apelido || "Jogador"}
                    {mp.emoji && (
                      <span className="text-sm select-none transition-transform hover:scale-125 duration-200" title="Emoji de desempenho para este palpite">
                        {mp.emoji}
                      </span>
                    )}
                    {mp.statusText && (
                      <span className={`text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded ${
                        mp.points === 3 
                          ? "bg-lime-400/10 text-lime-300 border border-lime-400/20" 
                          : mp.points === 1
                            ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/20"
                            : "bg-white/5 text-white/30 border border-white/5"
                      }`}>
                        {mp.statusText}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-lime-400 font-display text-lg leading-none">{mp.score_a}</span>
                  <span className="text-white/20 font-bold text-xs">x</span>
                  <span className="text-lime-400 font-display text-lg leading-none">{mp.score_b}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
