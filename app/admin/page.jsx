"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { fmtDT, getFlagEmoji } from "@/lib/scoring";
import { ShieldCheck, Download, Plus, RefreshCw, X, Loader2, Check } from "lucide-react";

export default function AdminPage() {
  const { user, profile, loading, supabase } = useApp();
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Form de jogo manual
  const [form, setForm] = useState({ team_a: "", team_b: "", flag_a: "", flag_b: "", match_datetime: "", group_name: "" });
  const [busy, setBusy] = useState(false);
  const [log, setLog]   = useState("");

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) router.push("/jogos");
  }, [user, profile, loading]);

  const loadMatches = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*").order("match_datetime");
    setMatches(data ?? []); setFetching(false);
  }, [supabase]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // ---- Importar tabela da Copa da API-Football ----
  const importSchedule = async () => {
    setBusy(true); setLog("Importando tabela da Copa 2026...");
    try {
      const res = await fetch("/api/admin/import-schedule", {
        method: "POST",
        headers: { "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      const json = await res.json();
      if (json.error) { setLog("Erro: " + json.error); }
      else { setLog(`${json.imported} jogos importados!`); await loadMatches(); }
    } catch (e) { setLog("Erro de conexão: " + e.message); }
    setBusy(false);
  };

  // ---- Forçar atualização de resultados ----
  const forceUpdate = async () => {
    setBusy(true); setLog("Buscando resultados na API-Football...");
    try {
      const res = await fetch("/api/cron/update-results", {
        headers: { "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      const json = await res.json();
      setLog(json.error ? "Erro: " + json.error : `${json.updated ?? 0} resultado(s) atualizado(s).`);
      await loadMatches();
    } catch (e) { setLog("Erro: " + e.message); }
    setBusy(false);
  };

  // ---- Adicionar jogo manualmente ----
  const addMatch = async () => {
    if (!form.team_a || !form.team_b || !form.match_datetime) {
      setLog("Preencha os dois times e a data/hora."); return;
    }
    setBusy(true);
    const { error } = await supabase.from("matches").insert({
      ...form,
      match_datetime: new Date(form.match_datetime).toISOString(),
    });
    if (error) { setLog("Erro: " + error.message); }
    else { setLog("Jogo adicionado."); setForm({ team_a: "", team_b: "", flag_a: "", flag_b: "", match_datetime: "", group_name: "" }); await loadMatches(); }
    setBusy(false);
  };

  // ---- Atualizar placar manualmente ----
  const setScore = async (id, field, val) => {
    await supabase.from("matches").update({ [field]: val === "" ? null : Number(val) }).eq("id", id);
    setMatches((prev) => prev.map((m) => m.id === id ? { ...m, [field]: val === "" ? null : Number(val) } : m));
  };

  const setFinished = async (id, finished) => {
    await supabase.from("matches").update({ finished }).eq("id", id);
    setMatches((prev) => prev.map((m) => m.id === id ? { ...m, finished } : m));
  };

  const removeMatch = async (id) => {
    await supabase.from("matches").delete().eq("id", id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading || !profile) return <Splash />;

  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        <PageHeader title="Admin" sub="Painel de controle de jogos e resultados" icon={<ShieldCheck size={22} strokeWidth={2.5} />} />

        {/* Ações principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-8">
          <ActionBtn icon={<Download size={18} />} label="Importar tabela Copa 2026 da API" color="emerald" onClick={importSchedule} busy={busy} />
          <ActionBtn icon={<RefreshCw size={18} />} label="Forçar busca de resultados agora" color="sky" onClick={forceUpdate} busy={busy} />
        </div>
        {log && (
          <div className="mb-6 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin text-lime-400" /> : <Check size={16} className="text-lime-400" />}
            {log}
          </div>
        )}

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
            <p className="text-[11px] text-white/40 font-extrabold uppercase tracking-wider mb-2 ml-1">{matches.length} jogos cadastrados</p>
            {matches.map((m) => (
              <div key={m.id} className="glass-panel rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    {getFlagEmoji(m.flag_a)} {m.team_a} <span className="text-white/30 text-xs">×</span> {m.team_b} {getFlagEmoji(m.flag_b)}
                  </span>
                  <button onClick={() => removeMatch(m.id)} className="text-white/30 hover:text-red-400 transition-colors p-1 hover:bg-white/5 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-white/40 font-medium">{fmtDT(m.match_datetime)} {m.group_name ? `• ${m.group_name}` : ""}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="?" value={m.score_a ?? ""}
                      onChange={(e) => setScore(m.id, "score_a", e.target.value)}
                      className="w-12 h-9 text-center text-lime-400 font-display text-lg p-0 border border-white/10 focus:border-lime-400" />
                    <span className="text-white/20 text-xs font-bold">×</span>
                    <input type="number" min="0" placeholder="?" value={m.score_b ?? ""}
                      onChange={(e) => setScore(m.id, "score_b", e.target.value)}
                      className="w-12 h-9 text-center text-lime-400 font-display text-lg p-0 border border-white/10 focus:border-lime-400" />
                    <button onClick={() => setFinished(m.id, !m.finished)}
                      className={`text-[11px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider transition ${m.finished ? "bg-lime-400 text-[#07060f]" : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/5 hover:text-white"}`}>
                      {m.finished ? "✔ Fim" : "Encerrar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick, busy }) {
  const colors = {
    emerald: "bg-lime-400/10 hover:bg-lime-400/20 text-lime-300 border-lime-400/20",
    sky:     "bg-orange-400/10 hover:bg-orange-400/20 text-orange-300 border-orange-400/20",
  };
  return (
    <button onClick={onClick} disabled={busy}
      className={`w-full border font-extrabold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 ${colors[color]}`}>
      {busy ? <Loader2 className="animate-spin" size={18} /> : icon}
      {label}
    </button>
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
