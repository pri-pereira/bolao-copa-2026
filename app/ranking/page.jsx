"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { computeRanking } from "@/lib/scoring";
import { ListOrdered, Crown, Users, Loader2 } from "lucide-react";

export default function RankingPage() {
  const { user, profile, loading, supabase } = useApp();
  const router = useRouter();
  const [ranking, setRanking] = useState([]);
  const [finishedCount, setFinishedCount] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading]);

  const loadRanking = useCallback(async () => {
    if (!user) return;
    const [{ data: profiles }, { data: picks }, { data: matches }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("picks").select("*"),
      supabase.from("matches").select("*"),
    ]);
    const r = computeRanking(profiles ?? [], picks ?? [], matches ?? []);
    setRanking(r);
    setFinishedCount((matches ?? []).filter((m) => m.finished).length);
    setFetching(false);
  }, [user, supabase]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  if (loading || !user) return <Splash />;

  const medal = ["text-yellow-400", "text-slate-300", "text-orange-400"];

  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        <PageHeader
          title="Ranking"
          sub={`${finishedCount} jogo${finishedCount !== 1 ? "s" : ""} encerrado${finishedCount !== 1 ? "s" : ""} — classificação geral atualizada`}
          icon={<ListOrdered size={22} strokeWidth={2.5} />}
        />

        {fetching ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-lime-400" size={36} /></div>
        ) : ranking.length === 0 ? (
          <div className="text-center mt-20 text-white/30 glass-panel rounded-3xl p-10 border border-white/5">
            <Users size={48} className="mx-auto mb-4 text-white/10" />
            <p className="font-extrabold text-lg text-white/70">Ninguém cadastrado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pódio top 3 */}
            {ranking.length >= 3 && (
              <div className="grid grid-cols-3 gap-2.5 mb-8 items-end">
                {[ranking[1], ranking[0], ranking[2]].map((r, vi) => {
                  if (!r) return null;
                  const pos = vi === 0 ? 2 : vi === 1 ? 1 : 3;
                  const heights = ["h-36", "h-44", "h-32"];
                  const isMe = r.id === user.id;

                  const bgGradients = [
                    "bg-gradient-to-t from-slate-400/10 to-slate-500/5 border-slate-400/20", // 2nd
                    "bg-gradient-to-t from-yellow-400/15 to-amber-500/5 border-yellow-400/35 shadow-lg shadow-yellow-500/5", // 1st
                    "bg-gradient-to-t from-orange-400/10 to-orange-500/5 border-orange-400/20", // 3rd
                  ];

                  const cardStyle = isMe
                    ? "border-lime-400/40 bg-lime-400/5 shadow-lg shadow-lime-400/5"
                    : bgGradients[pos - 1];

                  return (
                    <div key={r.id} className={`${heights[vi]} flex flex-col items-center justify-end pb-4 rounded-3xl border glass-panel transition-all duration-300 hover:translate-y-[-4px] ${cardStyle}`}>
                      {pos === 1 && <Crown size={22} className="text-yellow-400 mb-1 animate-bounce" />}
                      <div className="relative mb-2 shrink-0">
                        <img 
                          src={`/avatares/${r.avatar || "1889-hamster2.png"}`} 
                          alt={r.apelido} 
                          className={`w-10 h-10 rounded-full object-cover bg-[#0a0816] border-2 ${
                            pos === 1 ? "border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.25)]" : pos === 2 ? "border-slate-300" : "border-orange-400"
                          }`}
                        />
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full font-display text-[9px] font-extrabold flex items-center justify-center border text-[#07060f] ${
                          pos === 1 ? "bg-yellow-400 border-yellow-500" : pos === 2 ? "bg-slate-300 border-slate-400" : "bg-orange-400 border-orange-500"
                        }`}>
                          {pos}
                        </span>
                      </div>
                      <div className="font-display text-2xl text-white leading-none">{r.points} <span className="text-[8px] font-bold text-white/30 uppercase">pts</span></div>
                      <div className="text-[10px] font-extrabold text-center px-1.5 truncate w-full text-white/80 mt-1">{r.apelido}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lista completa */}
            {ranking.map((r, i) => {
              const isMe = r.id === user.id;
              return (
                <div key={r.id}
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 border transition-all duration-200 glass-panel ${isMe ? "border-lime-400/40 bg-lime-400/[0.04] shadow-md shadow-lime-400/5" : "border-white/5"}`}>
                  <span className={`font-display text-2xl w-8 text-center ${i < 3 ? medal[i] : "text-white/25"}`}>{i + 1}º</span>
                  <img 
                    src={`/avatares/${r.avatar || "1889-hamster2.png"}`} 
                    alt={r.apelido} 
                    className="w-9 h-9 rounded-full object-cover bg-[#0a0816] border border-white/10" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white truncate text-sm">{r.apelido}</p>
                      {isMe && <span className="text-[#07060f] bg-lime-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Você</span>}
                    </div>
                    <p className="text-xs text-white/45 font-medium mt-0.5">
                      {r.exact} cravados 🎯 · {r.partial} parciais
                    </p>
                  </div>
                  <div className="text-right flex items-baseline gap-1">
                    <span className="font-display text-3xl text-lime-400 leading-none">{r.points}</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
