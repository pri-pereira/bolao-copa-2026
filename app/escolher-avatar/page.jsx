"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { Trophy, Loader2, Check } from "lucide-react";
import { BgFx, Splash } from "../page";

export default function EscolherAvatarPage() {
  const { user, loading, updateAvatar, avatar: currentAvatar } = useApp();
  const router = useRouter();
  const [avatares, setAvatares] = useState([]);
  const [selected, setSelected] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading]);

  useEffect(() => {
    async function fetchAvatares() {
      try {
        const res = await fetch("/api/avatares");
        const json = await res.json();
        if (json.avatares) {
          setAvatares(json.avatares);
          setSelected(currentAvatar || json.avatares[0] || "1889-hamster2.png");
        }
      } catch (e) {
        console.error("Erro ao buscar avatares:", e);
      } finally {
        setFetching(false);
      }
    }
    if (user) fetchAvatares();
  }, [user, currentAvatar]);

  if (loading || !user) return <Splash />;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateAvatar(selected);
      router.push("/jogos");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-10">
      <BgFx />
      <div className="w-full max-w-xl relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-[#07060f] flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.35)] transform rotate-3">
            <Trophy size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-4xl text-white leading-none tracking-tight">
              Bolão da Vidros
            </h1>
            <p className="font-display text-xs text-white/50 tracking-widest leading-none mt-1.5 uppercase">
              Escolha seu Avatar
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <h2 className="font-display text-2xl mb-1 text-white text-center">Defina sua foto de jogador</h2>
          <p className="text-white/50 text-xs mb-6 text-center font-medium">
            Escolha entre as opções de imagens e GIFs animados abaixo. Ela aparecerá no ranking geral!
          </p>

          {fetching ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-lime-400" size={36} />
            </div>
          ) : (
            <>
              {/* Grid Scrollable de Avatares */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[320px] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {avatares.map((av) => {
                  const active = selected === av;
                  return (
                    <button
                      key={av}
                      onClick={() => setSelected(av)}
                      className={`relative flex flex-col items-center p-1.5 rounded-2xl border transition-all duration-200 ${
                        active 
                          ? "bg-lime-400/10 border-lime-400 text-lime-300 scale-105 shadow-lg shadow-lime-400/5" 
                          : "bg-white/5 border-white/5 hover:border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      <img 
                        src={`/avatares/${av}`} 
                        alt="Avatar Option" 
                        className="w-12 h-12 rounded-full object-cover bg-[#0a0816] border border-white/10" 
                      />
                      {active && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-lime-400 text-[#07060f] rounded-full flex items-center justify-center border border-[#07060f]">
                          <Check size={10} strokeWidth={4} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botão de Confirmação */}
              <button 
                onClick={handleSave} 
                disabled={saving || !selected}
                className="mt-6 w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold py-3.5 rounded-xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-lime-400/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:transform-none"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Confirmar Avatar e Ir Pro Bolão"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
