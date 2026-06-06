"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { Trophy, Loader2, Check } from "lucide-react";
import { BgFx, Splash } from "../page";

export default function RecuperarSenhaPage() {
  const { user, loading, supabase } = useApp();
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        if (!user) {
          setErr("Sessão expirada ou link inválido. Solicite um novo e-mail de recuperação.");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const submit = async () => {
    if (!pass || pass.length < 6) {
      setErr("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setErr("");
    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) {
        setErr(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/jogos");
        }, 2000);
      }
    } catch (e) {
      setErr("Erro de conexão ao tentar salvar.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Splash />;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-10">
      <BgFx />
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-[#07060f] flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.35)] transform rotate-3">
            <Trophy size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-4xl text-white leading-none tracking-tight">
              COPA 26
            </h1>
            <p className="font-display text-xs text-white/50 tracking-widest leading-none mt-1.5 uppercase">
              Recuperação de Senha
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          <h2 className="font-display text-2xl mb-1.5 text-white">Nova Senha</h2>
          <p className="text-white/50 text-xs mb-6 font-medium">
            Digite sua nova senha abaixo para reestabelecer o acesso à sua conta.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">Senha (mínimo 6 caracteres)</span>
              <input 
                type="password" 
                value={pass} 
                onChange={(e) => setPass(e.target.value)} 
                placeholder="••••••" 
                className="mt-1.5 w-full" 
              />
            </label>
          </div>

          {err && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium">
              {err}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-300 text-sm font-medium flex items-center gap-2">
              <Check size={16} />
              Senha atualizada com sucesso! Redirecionando...
            </div>
          )}

          <button 
            onClick={submit} 
            disabled={busy || success || (!user && err !== "")}
            className="mt-6 w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold py-3.5 rounded-xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-lime-400/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:transform-none"
          >
            {busy ? <Loader2 className="animate-spin" size={20} /> : "Salvar Nova Senha"}
          </button>

          <button 
            onClick={() => router.push("/")}
            className="mt-4 w-full text-sm font-semibold text-white/45 hover:text-lime-300 transition-colors duration-200"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    </main>
  );
}
