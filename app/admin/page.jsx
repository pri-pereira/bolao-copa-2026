"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { fmtDT, renderFlag } from "@/lib/scoring";
import { ShieldCheck, Plus, X, Loader2, Check, Save } from "lucide-react";

function getLocalDateString(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminPage() {
  const { user, profile, loading, supabase } = useApp();
  const router = useRouter();
  
  // Abas de navegação interna
  const [activeTab, setActiveTab] = useState("jogos"); // "jogos" | "participantes"
  
  // Estados de jogos
  const [matches, setMatches] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Estados de usuários
  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [filterPix, setFilterPix] = useState("todos"); // "todos" | "pagos" | "aguardando"

  // Form de jogo manual
  const [form, setForm] = useState({ team_a: "", team_b: "", flag_a: "", flag_b: "", match_datetime: "", group_name: "" });
  const [busy, setBusy] = useState(false);
  const [log, setLog]   = useState("");
  
  // Rastreia quais jogos tiveram placar alterado mas ainda não foram salvos
  const [dirtyMatches, setDirtyMatches] = useState(new Set());
  // Rastreia quais jogos tiveram placar salvo com sucesso (para feedback visual)
  const [savedMatches, setSavedMatches] = useState(new Set());

  // Filtro de data
  const [filterDate, setFilterDate] = useState("all");

  // Helper: faz chamadas autenticadas ao backend admin
  const adminFetch = useCallback(async (url, options = {}) => {
    const session = (await supabase.auth.getSession()).data.session;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
        ...options.headers,
      },
    });
  }, [supabase]);

  const loadMatches = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*").order("match_datetime");
    setMatches(data ?? []); setFetching(false);
    setDirtyMatches(new Set());
    setSavedMatches(new Set());
  }, [supabase]);

  const loadUsers = useCallback(async () => {
    setFetchingUsers(true);
    try {
      const res = await adminFetch("/api/admin/users");
      const json = await res.json();
      if (json.users) {
        setUsers(json.users);
      } else if (json.error) {
        setLog("Erro: " + json.error);
      }
    } catch (e) {
      setLog("Erro ao carregar participantes: " + e.message);
    }
    setFetchingUsers(false);
  }, [adminFetch]);

  useEffect(() => {
    if (profile?.is_admin || user?.email === 'priscillasantosp24@gmail.com') {
      loadMatches();
    }
  }, [loadMatches, profile, user]);

  useEffect(() => {
    if ((profile?.is_admin || user?.email === 'priscillasantosp24@gmail.com') && activeTab === "participantes") {
      loadUsers();
    }
  }, [activeTab, loadUsers, profile, user]);

  // Redireciona não-administradores imediatamente para a home
  useEffect(() => {
    if (!loading && (!user || (user.email !== 'priscillasantosp24@gmail.com' && !profile?.is_admin))) {
      router.push("/jogos");
    }
  }, [user, profile, loading, router]);

  // ---- Adicionar jogo manualmente ----
  const addMatch = async () => {
    if (!form.team_a || !form.team_b || !form.match_datetime) {
      setLog("Preencha os dois times e a data/hora."); return;
    }
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/update-match", {
        method: "POST",
        body: JSON.stringify({
          action: "insert",
          match: {
            ...form,
            match_datetime: new Date(form.match_datetime).toISOString(),
          }
        }),
      });
      const json = await res.json();
      if (json.error) { setLog("Erro: " + json.error); }
      else { setLog("✅ Jogo adicionado com sucesso!"); setForm({ team_a: "", team_b: "", flag_a: "", flag_b: "", match_datetime: "", group_name: "" }); await loadMatches(); }
    } catch (e) {
      setLog("Erro: " + e.message);
    }
    setBusy(false);
  };

  // ---- Atualizar placar localmente (apenas state) ----
  const setScore = (id, field, val) => {
    setMatches((prev) => prev.map((m) => m.id === id ? { ...m, [field]: val === "" ? null : Number(val) } : m));
    setDirtyMatches((prev) => new Set(prev).add(id));
    setSavedMatches((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  // ---- SALVAR PLACAR (grava no Supabase sem encerrar) ----
  const saveScore = async (id) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return;

    const golsA = Number(m.score_a ?? 0);
    const golsB = Number(m.score_b ?? 0);

    setBusy(true);
    setLog(`Salvando placar ${m.team_a} ${golsA} × ${golsB} ${m.team_b}...`);
    
    try {
      const res = await adminFetch("/api/admin/update-match", {
        method: "POST",
        body: JSON.stringify({
          action: "save_score",
          matchId: id,
          score_a: golsA,
          score_b: golsB,
        }),
      });
      const json = await res.json();
      
      if (json.error) {
        setLog("❌ Erro ao salvar placar: " + json.error);
      } else {
        // Atualização imediata do state local
        setMatches((prev) => prev.map((x) => x.id === id ? { ...x, score_a: golsA, score_b: golsB } : x));
        setDirtyMatches((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setSavedMatches((prev) => new Set(prev).add(id));
        setLog(`✅ Placar salvo: ${m.team_a} ${golsA} × ${golsB} ${m.team_b}`);
        // Remove o feedback de "salvo" após 3 segundos
        setTimeout(() => setSavedMatches((prev) => { const s = new Set(prev); s.delete(id); return s; }), 3000);
      }
    } catch (e) {
      setLog("❌ Erro de conexão: " + e.message);
    }
    setBusy(false);
  };

  // ---- ENCERRAR JOGO (Gravação final no Supabase) ----
  const setFinished = async (id) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return;

    const golsA = Number(m.score_a ?? 0);
    const golsB = Number(m.score_b ?? 0);

    // Confirmação antes de encerrar
    if (!window.confirm(`Confirma encerrar o jogo?\n\n${m.team_a} ${golsA} × ${golsB} ${m.team_b}\n\nApós encerrar, o ranking será recalculado.`)) return;

    setBusy(true);
    setLog(`Encerrando jogo ${m.team_a} × ${m.team_b}...`);
    
    try {
      const res = await adminFetch("/api/admin/update-match", {
        method: "POST",
        body: JSON.stringify({
          action: "finish",
          matchId: id,
          score_a: golsA,
          score_b: golsB,
        }),
      });
      const json = await res.json();
      
      if (json.error) {
        setLog("❌ Erro ao encerrar jogo: " + json.error);
      } else {
        // Atualização imediata do state local
        setMatches((prev) => prev.map((x) => x.id === id ? { ...x, score_a: golsA, score_b: golsB, finished: true } : x));
        setDirtyMatches((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setLog(`✅ Jogo ${m.team_a} ${golsA} × ${golsB} ${m.team_b} encerrado! Ranking atualizado.`);
      }
    } catch (e) {
      setLog("❌ Erro de conexão: " + e.message);
    }
    setBusy(false);
  };

  const clearFinished = async (id) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return;
    
    if (!window.confirm(`Reabrir o jogo ${m.team_a} × ${m.team_b}?\n\nO ranking será recalculado.`)) return;
    
    setBusy(true);
    setLog(`Reabrindo jogo ${m.team_a} × ${m.team_b}...`);
    
    try {
      const res = await adminFetch("/api/admin/update-match", {
        method: "POST",
        body: JSON.stringify({
          action: "reopen",
          matchId: id,
        }),
      });
      const json = await res.json();
      
      if (json.error) {
        setLog("❌ Erro ao reabrir jogo: " + json.error);
      } else {
        setMatches((prev) => prev.map((x) => x.id === id ? { ...x, finished: false } : x));
        setLog(`✅ Jogo ${m.team_a} × ${m.team_b} reaberto para edição!`);
      }
    } catch (e) {
      setLog("❌ Erro de conexão: " + e.message);
    }
    setBusy(false);
  };

  const removeMatch = async (id) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return;
    if (!window.confirm(`Excluir o jogo ${m.team_a} × ${m.team_b}?`)) return;
    
    try {
      const res = await adminFetch("/api/admin/update-match", {
        method: "POST",
        body: JSON.stringify({ action: "delete", matchId: id }),
      });
      const json = await res.json();
      if (json.error) {
        setLog("❌ Erro: " + json.error);
      } else {
        setMatches((prev) => prev.filter((x) => x.id !== id));
        setLog("✅ Jogo removido.");
      }
    } catch (e) {
      setLog("❌ Erro: " + e.message);
    }
  };

  // ---- Controle de Acesso Pix ----
  const togglePixStatus = async (userId, action) => {
    setBusy(true); setLog(action === "approve" ? "Aprovando pagamento..." : "Removendo acesso...");
    try {
      const res = await adminFetch("/api/admin/approve-pix", {
        method: "POST",
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (json.success) {
        setLog(json.message);
        await loadUsers();
      } else {
        setLog("Erro: " + json.error);
      }
    } catch (e) {
      setLog("Erro ao processar alteração: " + e.message);
    }
    setBusy(false);
  };

  if (loading) return <Splash />;

  // Bloqueio Físico Estrito para Não-Admins
  if (!user || (user.email !== 'priscillasantosp24@gmail.com' && !profile?.is_admin)) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4">
        <BgFx />
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-white/10 text-center relative overflow-hidden shadow-2xl animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6">
            <span className="text-3xl select-none">🚫</span>
          </div>
          <h2 className="font-display text-2xl text-white mb-3">Acesso restrito ao administrador.</h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Esta página é exclusiva para o administrador aprovar pagamentos e configurar a tabela de jogos oficiais.
          </p>
          <button 
            onClick={() => router.push("/jogos")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold py-3.5 rounded-xl transition duration-200"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        <PageHeader title="Admin" sub="Painel de controle manual — jogos e resultados" icon={<ShieldCheck size={22} strokeWidth={2.5} />} />

        {/* Alternador de Abas */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/5 relative z-10">
          <button 
            onClick={() => { setActiveTab("jogos"); setLog(""); }}
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === "jogos" ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f]" : "text-white/50 hover:text-white"}`}
          >
            Jogos da Copa
          </button>
          <button 
            onClick={() => { setActiveTab("participantes"); setLog(""); }}
            className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === "participantes" ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f]" : "text-white/50 hover:text-white"}`}
          >
            Aprovação de Pix
          </button>
        </div>

        {log && (
          <div className="mb-6 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin text-lime-400" /> : <Check size={16} className="text-lime-400" />}
            {log}
          </div>
        )}

        {/* ABA 1: GERENCIAMENTO DE JOGOS */}
        {activeTab === "jogos" && (
          <>
            {/* Adicionar jogo manualmente */}
            <div className="glass-panel rounded-3xl p-5 mb-8 relative overflow-hidden">
              <p className="font-extrabold text-white mb-4 text-sm uppercase tracking-wider text-white/70">Adicionar jogo manualmente</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Time A" value={form.team_a} onChange={(v) => setForm(f => ({ ...f, team_a: v }))} placeholder="Brasil" />
                <Field label="🏳️ Bandeira A (emoji)" value={form.flag_a} onChange={(v) => setForm(f => ({ ...f, flag_a: v }))} placeholder="🇧🇷" />
                <Field label="Time B" value={form.team_b} onChange={(v) => setForm(f => ({ ...f, team_b: v }))} placeholder="Argentina" />
                <Field label="🏳️ Bandeira B (emoji)" value={form.flag_b} onChange={(v) => setForm(f => ({ ...f, flag_b: v }))} placeholder="🇦🇷" />
                <label className="block col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">Data e hora</span>
                  <input type="datetime-local" value={form.match_datetime}
                    onChange={(e) => setForm(f => ({ ...f, match_datetime: e.target.value }))} className="mt-1.5 w-full" />
                </label>
                <Field label="Fase / Grupo" value={form.group_name} onChange={(v) => setForm(f => ({ ...f, group_name: v }))} placeholder="Grupo A" />
              </div>
              <button onClick={addMatch} disabled={busy}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold py-3.5 rounded-2xl transition-all duration-250 flex items-center justify-center gap-2">
                <Plus size={18} /> Adicionar jogo
              </button>
            </div>

            {/* Lista de jogos */}
            {fetching ? (
              <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-lime-400" size={32} /></div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 mb-4">
                  <p className="text-[11px] text-white/40 font-extrabold uppercase tracking-wider ml-1 mb-0">{matches.length} jogos cadastrados</p>
                  
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-[#07060f] border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-lime-400 transition cursor-pointer"
                  >
                    <option value="all">Todas as datas</option>
                    {Array.from(new Set(matches.map(m => getLocalDateString(m.match_datetime)))).filter(Boolean).sort().map(date => {
                      const [year, month, day] = date.split('-');
                      return <option key={date} value={date}>{`${day}/${month}/${year}`}</option>;
                    })}
                  </select>
                </div>
                {matches.filter(m => filterDate === "all" || getLocalDateString(m.match_datetime) === filterDate).map((m) => {
                  const isDirty = dirtyMatches.has(m.id);
                  const isSaved = savedMatches.has(m.id);
                  
                  return (
                    <div key={m.id} className={`glass-panel rounded-2xl p-4 border flex flex-col gap-3 transition-all duration-300 ${m.finished ? "border-lime-400/20 bg-lime-400/[0.02]" : isDirty ? "border-yellow-400/30 bg-yellow-400/[0.02]" : isSaved ? "border-lime-400/30 bg-lime-400/[0.03]" : "border-white/5"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                          {renderFlag(m.flag_a, "w-6 h-4 object-cover rounded shadow-sm inline-block align-middle mr-1.5")} {m.team_a} <span className="text-white/30 text-xs">×</span> {m.team_b} {renderFlag(m.flag_b, "w-6 h-4 object-cover rounded shadow-sm inline-block align-middle ml-1.5")}
                        </span>
                        <div className="flex items-center gap-2">
                          {m.finished && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-lg border border-lime-400/20 flex items-center gap-1">
                              ✓ FIM
                            </span>
                          )}
                          {isSaved && !m.finished && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-lime-400 bg-lime-400/10 px-2 py-1 rounded-lg border border-lime-400/20 flex items-center gap-1 animate-fade-in">
                              ✓ Salvo
                            </span>
                          )}
                          {isDirty && !m.finished && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20 flex items-center gap-1">
                              ● Não salvo
                            </span>
                          )}
                          {!m.finished && (
                            <button onClick={() => removeMatch(m.id)} className="text-white/30 hover:text-red-400 transition-colors p-1 hover:bg-white/5 rounded-lg">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-white/40 font-medium">{fmtDT(m.match_datetime)} {m.group_name ? `• ${m.group_name}` : ""}</span>
                        <div className="flex items-center gap-2">
                          {m.finished ? (
                            <>
                              <span className="w-12 h-9 flex items-center justify-center text-lime-400 font-display text-lg bg-lime-400/5 rounded-md border border-lime-400/15">{m.score_a ?? "-"}</span>
                              <span className="text-white/20 text-xs font-bold">×</span>
                              <span className="w-12 h-9 flex items-center justify-center text-lime-400 font-display text-lg bg-lime-400/5 rounded-md border border-lime-400/15">{m.score_b ?? "-"}</span>
                            </>
                          ) : (
                            <>
                              <input type="number" min="0" placeholder="0" value={m.score_a ?? ""}
                                onChange={(e) => setScore(m.id, "score_a", e.target.value)}
                                className="w-12 h-9 text-center text-lime-400 font-display text-lg p-0 border border-white/10 focus:border-lime-400 rounded-md bg-white/5" />
                              <span className="text-white/20 text-xs font-bold">×</span>
                              <input type="number" min="0" placeholder="0" value={m.score_b ?? ""}
                                onChange={(e) => setScore(m.id, "score_b", e.target.value)}
                                className="w-12 h-9 text-center text-lime-400 font-display text-lg p-0 border border-white/10 focus:border-lime-400 rounded-md bg-white/5" />
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Botões de ação */}
                      {!m.finished && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveScore(m.id)} disabled={busy || !isDirty}
                            className={`flex-1 text-[11px] px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${isDirty ? "bg-yellow-400 text-[#07060f] hover:bg-yellow-300 shadow-md shadow-yellow-400/15" : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"}`}>
                            <Save size={14} /> Salvar Placar
                          </button>
                          <button onClick={() => setFinished(m.id)} disabled={busy}
                            className="flex-1 text-[11px] px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition bg-lime-400/10 text-lime-300 hover:bg-lime-400/20 border border-lime-400/20 hover:text-lime-200 flex items-center justify-center gap-1.5">
                            <Check size={14} /> Encerrar Jogo
                          </button>
                        </div>
                      )}
                      {m.finished && (
                        <div className="flex pt-1">
                          <button onClick={() => clearFinished(m.id)} disabled={busy}
                            className="w-full text-[11px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider transition bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                            Reabrir jogo para edição
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ABA 2: APROVAÇÃO DE PARTICIPANTES (PIX) */}
        {activeTab === "participantes" && (
          <div className="space-y-6 animate-fade-in">
            {/* Cards Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Inscritos</p>
                <p className="font-display text-xl sm:text-2xl text-white">{users.filter(u => !u.is_admin).length}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-lime-400/20 text-center bg-lime-400/5 flex flex-col justify-center">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-lime-400/70 mb-1">Pagos</p>
                <p className="font-display text-xl sm:text-2xl text-lime-400">{users.filter(u => u.pix_aprovado && !u.is_admin).length}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-red-500/20 text-center bg-red-500/5 flex flex-col justify-center">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-1">Faltam</p>
                <p className="font-display text-xl sm:text-2xl text-red-400">{users.filter(u => !u.pix_aprovado && !u.is_admin).length}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
              {["todos", "pagos", "aguardando"].map((f) => (
                <button 
                  key={f}
                  onClick={() => setFilterPix(f)}
                  className={`flex-1 py-2.5 px-3 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 whitespace-nowrap ${filterPix === f ? "bg-white/10 text-white shadow-md" : "text-white/40 hover:text-white/80"}`}
                >
                  {f === "todos" ? "Todos" : f === "pagos" ? "Pagos" : "Aguardando"}
                </button>
              ))}
            </div>

            {/* Lista Dinâmica */}
            <div className="glass-panel rounded-3xl p-5 border border-white/5 relative overflow-hidden">
              {fetchingUsers ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-lime-400" size={32} /></div>
              ) : (
                <div className="space-y-3">
                  {users
                    .filter(u => !u.is_admin)
                    .filter(u => {
                      if (filterPix === "pagos") return u.pix_aprovado;
                      if (filterPix === "aguardando") return !u.pix_aprovado;
                      return true;
                    })
                    .map((u) => (
                      <div key={u.id} className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${u.pix_aprovado ? "bg-white/[0.01] border-white/5 opacity-80 hover:opacity-100" : "bg-white/[0.03] border-white/10"}`}>
                        <div className="flex items-center gap-3">
                          <img 
                            src={`/avatares/${u.avatar || "1889-hamster2.png"}`} 
                            alt={u.apelido} 
                            className="w-10 h-10 rounded-full border border-white/10 object-cover bg-black" 
                          />
                          <div>
                            <p className="font-bold text-sm text-white flex items-center gap-1.5">{u.apelido}</p>
                            <p className="text-xs text-white/40 font-medium">{u.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                          {u.pix_aprovado ? (
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-lime-400 bg-lime-400/5 px-3 py-1.5 rounded-lg border border-lime-400/10">
                                Pago
                              </span>
                              <button 
                                onClick={() => togglePixStatus(u.id, "revoke")}
                                disabled={busy}
                                className="text-[9px] text-white/30 hover:text-red-400 font-bold uppercase px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/5 transition"
                              >
                                Remover Acesso
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                                Aguardando
                              </span>
                              <button 
                                onClick={() => togglePixStatus(u.id, "approve")}
                                disabled={busy}
                                className="bg-lime-400 hover:bg-lime-300 text-[#07060f] font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition duration-200 shadow-md shadow-lime-400/15 disabled:opacity-50 shrink-0"
                              >
                                Marcar como Pago
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {users.filter(u => !u.is_admin).length === 0 && (
                    <div className="text-center py-8 text-white/35">
                      <p className="font-bold text-sm">Nenhum participante encontrado.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="mt-1.5 w-full" />
    </label>
  );
}