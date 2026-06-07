"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { computeRanking } from "@/lib/scoring";
import confetti from "canvas-confetti";

const AppCtx = createContext({});
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const MODO_TESTE = false; // Chave mestre global do modo de teste (Altere para false para produção)
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRankingPos, setMyRankingPos] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }

  const [theme] = useState("dark"); // Travar no tema dark por enquanto

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    setProfile(data ?? null);
  }, [supabase]);

  // Função para exibir notificações Toast
  const showNotification = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  }, []);

  // Recalcular posição do usuário ativo no ranking
  const checkPositionChange = useCallback(async (uid) => {
    if (!uid) return null;
    try {
      const [{ data: profiles }, { data: picks }, { data: matches }] = await Promise.all([
        supabase.from("profiles").select("id, apelido"),
        supabase.from("picks").select("profile_id, match_id, score_a, score_b"),
        supabase.from("matches").select("id, score_a, score_b, finished"),
      ]);
      const r = computeRanking(profiles ?? [], picks ?? [], matches ?? []);
      const pos = r.findIndex((p) => p.id === uid) + 1;
      return pos;
    } catch (e) {
      console.error("Erro ao verificar posição no ranking:", e);
      return null;
    }
  }, [supabase]);

  // Forçar remoção de qualquer classe 'light'
  useEffect(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.remove("light");
  }, []);

  // Fluxo de sessão
  useEffect(() => {
    if (MODO_TESTE) {
      const localUserRaw = localStorage.getItem("user_teste");
      if (localUserRaw) {
        const u = JSON.parse(localUserRaw);
        setUser(u);
        setProfile({
          id: u.id,
          apelido: u.user_metadata?.apelido || "Você",
          avatar: u.user_metadata?.avatar || "1889-hamster2.png"
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u.id).finally(() => setLoading(false));
        checkPositionChange(u.id).then((pos) => {
          if (pos) setMyRankingPos(pos);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u.id);
        const pos = await checkPositionChange(u.id);
        if (pos) setMyRankingPos(pos);
      } else {
        setProfile(null);
        setMyRankingPos(null);
      }

      if (event === "PASSWORD_RECOVERY") {
        router.push("/recuperar-senha");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, checkPositionChange]);

  // Escuta Realtime na tabela de matches
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-matches")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        async (payload) => {
          const oldMatch = payload.old;
          const newMatch = payload.new;

          // Detecta se o jogo acabou de ser finalizado
          if (newMatch.finished && !oldMatch.finished) {
            // 1. Verificar palpite do usuário logado
            const { data: pick } = await supabase
              .from("picks")
              .select("score_a, score_b")
              .eq("profile_id", user.id)
              .eq("match_id", newMatch.id)
              .maybeSingle();

            const pa = pick ? Number(pick.score_a) : 0;
            const pb = pick ? Number(pick.score_b) : 0;

            // Se for palpite exato (Cravou!)
            if (pa === newMatch.score_a && pb === newMatch.score_b) {
              confetti({
                particleCount: 150,
                spread: 85,
                origin: { y: 0.6 }
              });
            }

            // 2. Verificar se a posição no ranking mudou
            const newPos = await checkPositionChange(user.id);
            if (newPos && myRankingPos && newPos !== myRankingPos) {
              let type = "info";
              let msg = "";

              if (newPos === 1 && myRankingPos !== 1) {
                type = "crown";
                msg = "🏆 SENSACIONAL! Você subiu para o topo e assumiu a liderança do ranking!";
              } else if (newPos > 1 && myRankingPos === 1) {
                type = "danger";
                msg = "🚨 Atenção: Você perdeu a liderança do ranking. O campeonato continua!";
              } else if (newPos < myRankingPos) {
                type = "up";
                msg = `📈 Boa! Você subiu de posição no ranking: de ${myRankingPos}º para ${newPos}º colocado!`;
              } else if (newPos > myRankingPos) {
                type = "down";
                msg = `📉 Alerta: Você caiu de posição no ranking: de ${myRankingPos}º para ${newPos}º colocado.`;
              }

              if (msg) {
                showNotification(msg, type);
              }
              setMyRankingPos(newPos);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, myRankingPos, supabase, checkPositionChange, showNotification]);

  const toggleTheme = () => {
    // No-op (botão desabilitado por enquanto)
  };

  const signOut = async () => {
    if (MODO_TESTE) {
      localStorage.removeItem("user_teste");
      localStorage.removeItem("picks_teste");
      localStorage.removeItem("needsAvatarSelection");
      setUser(null); setProfile(null); setMyRankingPos(null);
      router.push("/");
      return;
    }
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setMyRankingPos(null);
  };

  const apelido = profile?.apelido || user?.user_metadata?.apelido || "";
  const avatar  = profile?.avatar  || user?.user_metadata?.avatar  || "1889-hamster2.png";

  const updateAvatar = async (newAvatar) => {
    if (!user) return;
    if (MODO_TESTE) {
      setProfile((prev) => {
        const updated = prev ? { ...prev, avatar: newAvatar } : null;
        const localUserRaw = localStorage.getItem("user_teste");
        if (localUserRaw) {
          const u = JSON.parse(localUserRaw);
          u.user_metadata = { ...u.user_metadata, avatar: newAvatar };
          localStorage.setItem("user_teste", JSON.stringify(u));
        }
        return updated;
      });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar: newAvatar })
      .eq("id", user.id);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, avatar: newAvatar } : null);
    } else {
      console.error("Erro ao atualizar avatar:", error.message);
    }
  };

  return (
    <AppCtx.Provider value={{ user, profile, apelido, avatar, updateAvatar, loading, supabase, signOut, loadProfile, theme, toggleTheme, MODO_TESTE }}>
      {children}
      {toast && <NotificationToast toast={toast} onClose={() => setToast(null)} />}
    </AppCtx.Provider>
  );
}

function NotificationToast({ toast, onClose }) {
  const icons = {
    crown: "🏆",
    danger: "🚨",
    up: "📈",
    down: "📉",
    info: "🔔",
  };

  const borders = {
    crown: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
    up: "border-lime-500/30 bg-lime-500/10 text-lime-300",
    down: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };

  return (
    <div className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl border backdrop-blur-md shadow-2xl animate-fade-in flex items-start gap-3 ${borders[toast.type] || "border-white/10 bg-white/5 text-white"}`}>
      <span className="text-2xl shrink-0 select-none">{icons[toast.type] || "🔔"}</span>
      <div className="flex-1 text-xs font-semibold leading-relaxed">
        {toast.message}
      </div>
      <button onClick={onClose} className="text-white/45 hover:text-white shrink-0 text-sm font-bold ml-1">×</button>
    </div>
  );
}
