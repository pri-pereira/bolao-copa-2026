"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Trophy, Loader2, CalendarDays } from "lucide-react";
import { carregarJogosCopa } from "../api";

export default function Home() {
  const { user, loading, supabase } = useApp();
  const router = useRouter();

  // Estados do Formulário de Login/Cadastro
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [apelido, setApelido]   = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy]         = useState(false);

  // Estados da Tabela de Jogos
  const [todosOsJogos, setTodosOsJogos] = useState([]);
  const [jogosFiltrados, setJogosFiltrados] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Jogos do dia');
  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    setMounted(true);
  }, []);

  useEffect(() => { 
    if (!loading && user) {
      const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
      if (!isRecovery) {
        const needsAvatar = localStorage.getItem("needsAvatarSelection");
        if (needsAvatar === "true") {
          router.push("/escolher-avatar");
        } else {
          router.push("/jogos");
        }
      }
    } 
  }, [user, loading]);

  useEffect(() => {
    async function iniciar() {
      try {
        const lista = await carregarJogosCopa();
        setTodosOsJogos(lista);
      } catch (err) {
        console.error("Erro no carregamento:", err);
      }
    }
    iniciar();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const hoje = new Date();

    const filtrar = todosOsJogos.filter(jogo => {
      const dataJogo = jogo.data instanceof Date ? jogo.data : new Date(jogo.data);

      switch (categoriaAtiva) {
        case 'Jogos do dia':
          return dataJogo.getFullYear() === hoje.getFullYear() &&
                 dataJogo.getMonth() === hoje.getMonth() &&
                 dataJogo.getDate() === hoje.getDate();
        case 'Todos':
          return true;
        case 'Grupos':
          return jogo.fase === 'GROUP_STAGE';
        case 'fase Mata-Mata':
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

  const formatGroupName = (apiGroup) => {
    if (!apiGroup) return "Fase de Grupos";
    const letter = apiGroup.replace("GROUP_", "");
    return `Grupo ${letter}`;
  };

  const agruparPorGrupo = (jogos) => {
    const grupos = {};
    jogos.forEach(jogo => {
      const nomeGrupo = formatGroupName(jogo.grupo);
      if (!grupos[nomeGrupo]) {
        grupos[nomeGrupo] = [];
      }
      grupos[nomeGrupo].push(jogo);
    });
    return grupos;
  };

  const submit = async () => {
    setErr(""); setSuccessMsg(""); setBusy(true);
    try {
      if (mode === "cadastro") {
        if (!email.trim()) { setErr("Insira um e-mail válido."); setBusy(false); return; }
        if (!apelido.trim()) { setErr("Escolha um apelido."); setBusy(false); return; }
        if (!pass || pass.length < 6) { setErr("A senha deve ter no mínimo 6 caracteres."); setBusy(false); return; }
        
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

        localStorage.setItem("needsAvatarSelection", "true");

        const { error } = await supabase.auth.signUp({
          email: email.trim(), password: pass,
          options: { data: { apelido: apelido.trim(), avatar: "1889-hamster2.png" } },
        });
        if (error) { 
          localStorage.removeItem("needsAvatarSelection");
          setErr(error.message); 
          return; 
        }
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

  const renderCardJogo = (jogo) => {
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

    const formatHora = (date) => {
      try {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch { return "--:--"; }
    };

    const formatDataCompleta = (date) => {
      try {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch { return ""; }
    };

    return (
      <div key={jogo.id} className="glass-panel rounded-3xl p-5 hover:border-white/15 relative overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <CalendarDays size={12} className="text-lime-400" />
            {mounted 
              ? `${formatDataCompleta(dataJogo)} às ${formatHora(dataJogo)}` 
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
  };

  if (loading) return <Splash />;
  if (user) return null; // Redirecionamento automático pelo useEffect

  return (
    <main className="min-h-screen relative overflow-hidden pb-12">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-12">
        
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
          
          <button 
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold px-5 py-2.5 rounded-2xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20"
          >
            Entrar no Bolão
          </button>
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
          
          {!mounted ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-lime-400" size={36} />
            </div>
          ) : jogosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-white/30 glass-panel rounded-3xl p-10 border border-white/5">
              <p className="font-extrabold text-lg text-white/70">
                {categoriaAtiva === 'Jogos do dia' 
                  ? "Nenhum jogo agendado para o dia de hoje." 
                  : "Nenhum jogo encontrado"}
              </p>
              <p className="text-sm mt-1 max-w-sm mx-auto text-white/40">Não há partidas nesta categoria no momento.</p>
            </div>
          ) : categoriaAtiva === 'Grupos' ? (
            (() => {
              const gruposAgrupados = agruparPorGrupo(jogosFiltrados);
              const gruposOrdenados = Object.keys(gruposAgrupados).sort();
              return (
                <div className="space-y-8 animate-fade-in">
                  {gruposOrdenados.map(nomeGrupo => (
                    <div key={nomeGrupo} className="space-y-4">
                      <h3 className="font-display text-lg text-lime-400 border-b border-white/5 pb-2 flex items-center justify-between">
                        <span>{nomeGrupo}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-white/40">
                          {gruposAgrupados[nomeGrupo].length} jogo{gruposAgrupados[nomeGrupo].length !== 1 ? 's' : ''}
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {gruposAgrupados[nomeGrupo].map(jogo => renderCardJogo(jogo))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {jogosFiltrados.map(jogo => renderCardJogo(jogo))}
            </div>
          )}
        </section>

        {/* Modal de Autenticação */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md glass-panel rounded-3xl p-8 overflow-hidden border border-white/10 shadow-2xl">
              {/* Botão de Fechar */}
              <button 
                onClick={() => { setShowAuthModal(false); setErr(""); setSuccessMsg(""); }}
                className="absolute top-4 right-4 text-white/40 hover:text-white font-bold text-xl select-none"
              >
                ×
              </button>
              
              {/* Luzes decorativas */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

              <h2 className="font-display text-3xl mb-1.5 text-white">
                {mode === "login" ? "Entrar" : mode === "cadastro" ? "Criar conta" : "Recuperar Conta"}
              </h2>
              <p className="text-white/50 text-sm mb-6 font-medium font-sans">
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
                  <div className="relative font-sans">
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
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium font-sans">
                  {err}
                </div>
              )}

              {successMsg && (
                <div className="mt-4 p-3 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-300 text-sm font-medium font-sans">
                  {successMsg}
                </div>
              )}

              <button onClick={submit} disabled={busy}
                className="mt-6 w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold py-3.5 rounded-xl hover:from-lime-300 hover:to-emerald-400 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-lime-400/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:transform-none text-sm uppercase tracking-wider font-sans">
                {busy ? <Loader2 className="animate-spin" size={20} /> : (mode === "login" ? "Entrar no Bolão" : mode === "cadastro" ? "Cadastrar Jogador" : "Enviar E-mail de Recuperação")}
              </button>

              {mode !== "recuperar" ? (
                <button onClick={() => { setMode(mode === "login" ? "cadastro" : "login"); setErr(""); setSuccessMsg(""); }}
                  className="mt-5 w-full text-sm font-semibold text-white/50 hover:text-lime-300 transition-colors duration-200 font-sans">
                  {mode === "login" ? "Não tem conta? Cadastre-se grátis" : "Já tem conta? Fazer login"}
                </button>
              ) : (
                <button onClick={() => { setMode("login"); setErr(""); setSuccessMsg(""); }}
                  className="mt-5 w-full text-sm font-semibold text-white/50 hover:text-lime-300 transition-colors duration-200 font-sans">
                  Voltar para o Login
                </button>
              )}
            </div>
          </div>
        )}

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
