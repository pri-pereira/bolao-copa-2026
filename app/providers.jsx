"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const AppCtx = createContext({});
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState("dark");

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    setProfile(data ?? null);
  }, [supabase]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      else setProfile(null);

      if (event === "PASSWORD_RECOVERY") {
        router.push("/recuperar-senha");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  };

  const apelido = profile?.apelido || user?.user_metadata?.apelido || "";
  const avatar  = profile?.avatar  || user?.user_metadata?.avatar  || "1889-hamster2.png";

  const updateAvatar = async (newAvatar) => {
    if (!user) return;
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
    <AppCtx.Provider value={{ user, profile, apelido, avatar, updateAvatar, loading, supabase, signOut, loadProfile, theme, toggleTheme }}>
      {children}
    </AppCtx.Provider>
  );
}
