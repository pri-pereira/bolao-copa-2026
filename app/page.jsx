"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Trophy, Loader2 } from "lucide-react";



export default function Home() {
  const { user, loading, supabase } = useApp();
  const router = useRouter();
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [apelido, setApelido]   = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy]         = useState(false);

  useEffect(() => { 
    if (!loading && user) {
      const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
      if (!isRecovery) {
        router.push("/jogos");
      }
    } 
  }, [user, loading]);

  if (loading) return <Splash />;
  if (user) return null;

  const submit = async () => {
    setErr(""); setSuccessMsg(""); setBusy(true);
    try {
      if (mode === "cadastro") {
        if (!email.trim()) { setErr("Insira um e-mail válido."); setBusy(false); return; }
        if (!apelido.trim()) { setErr("Escolha um apelido."); setBusy(false); return; }
        if (!pass || pass.length < 6) { setErr("A senha deve ter no mínimo 6 caracteres."); setBusy(false); return; }
        
        // Verifica se o e-mail já existe
        const checkRes = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() })
        });
        const { exists } = await checkRes.json();
        if (exists) {
          setErr("Este e-mail já está cadastrado no bolão.");
          setBusy(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(), password: pass,
          options: { data: { apelido: apelido.trim(), avatar: "1889-hamster2.png" } },
        });
        if (error) { setErr(error.message); return; }
        router.push("/escolher-avatar");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) { setErr("Email ou senha incorretos."); return; }
        router.push("/jogos");
      } else if (mode === "recuperar") {
        if (!email.trim()) { setErr("Insira um e-mail válido."); setBusy(false); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/recuperar-senha`,
        });
        if (error) {
          setErr(error.message);
        } else {
          setSuccessMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
          setTimeout(() => {
            setMode("login");
            setSuccessMsg("");
            setErr("");
          }, 3500);
        }
      }
    } catch (e) {
      setErr("Erro de conexão ao tentar processar.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <BgFx />
      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="relative group select-none">
            {/* Brilho neon sutil ao fundo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-lime-400 to-emerald-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-300"></div>
            <img 
              src="/logo-copa26.png" 
              alt="Logo Copa 2026" 
              className="relative w-36 h-36 object-contain rounded-3xl bg-black border border-white/10 p-2.5 shadow-2xl transition-transform duration-300 hover:scale-105" 
            />
          </div>
          <div className="mt-2">
            <h1 className="font-display text-4xl text-white leading-none tracking-tight">
              COPA 26
            </h1>
            <p className="font-display text-xs text-white/50 tracking-widest leading-none mt-1.5">
              Bolão da Vidros
            </p>
          </div>
        </div>

        {/* Login/Cadastro Card */}
        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          {/* Luzes internas decorativas */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="font-display text-3xl mb-1.5 text-white">
            {mode === "login" ? "Entrar" : mode === "cadastro" ? "Criar conta" : "Recuperar Conta"}
          </h2>
          <p className="text-white/50 text-sm mb-6 font-medium">
            {mode === "login" 
              ? "Bem-vindo de volta ao campo." 
              : mode === "cadastro" 
                ? "Escolha seu apelido pro ranking." 
                : "Insira seu e-mail para recuperar a senha."}
          </p>

          <div className="space-y-4">
            <Field label="Email" value={email} onChange={setEmail} placeholder="seu@email.com" type="email" />
            {mode === "cadastro" && (
              <Field label="Apelido (aparece no ranking)" value={apelido} onChange={setApelido} placeholder="Craque do Bairro" />
            )}
            {mode !== "recuperar" && (
              <div className="relative">
                <Field label="Senha" value={pass} onChange={setPass} type="password" placeholder="••••••" />
                {mode === "login" && (
                  <button 
                    onClick={() => { setMode("recuperar"); setErr(""); setSuccessMsg(""); }}
                    className="absolute right-1 top-0 text-[10px] font-bold uppercase tracking-wider text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
            )}
          </div>

          {err && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium">
              {err}
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-300 text-sm font-medium">
              {successMsg}
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="mt-6 w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold py-3.5 rounded-xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-lime-400/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:transform-none">
            {busy ? <Loader2 className="animate-spin" size={20} /> : (mode === "login" ? "Entrar no Bolão" : mode === "cadastro" ? "Cadastrar Jogador" : "Enviar E-mail de Recuperação")}
          </button>

          {mode !== "recuperar" ? (
            <button onClick={() => { setMode(mode === "login" ? "cadastro" : "login"); setErr(""); setSuccessMsg(""); }}
              className="mt-5 w-full text-sm font-semibold text-white/50 hover:text-lime-300 transition-colors duration-200">
              {mode === "login" ? "Não tem conta? Cadastre-se grátis" : "Já tem conta? Fazer login"}
            </button>
          ) : (
            <button onClick={() => { setMode("login"); setErr(""); setSuccessMsg(""); }}
              className="mt-5 w-full text-sm font-semibold text-white/50 hover:text-lime-300 transition-colors duration-200">
              Voltar para o Login
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="mt-1.5 w-full" />
    </label>
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
