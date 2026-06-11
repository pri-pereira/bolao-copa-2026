"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav } from "../components";
import { BgFx, Splash } from "../page";
import { MessageSquare, Send, Loader2, Home } from "lucide-react";
import Link from "next/link";

export default function ResenhaPage() {
  const { user, apelido, avatar, supabase, loading } = useApp();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const inputRef = useRef(null);

  // Altura do BottomNav (~80px) + barra de input (~64px) + margem (~8px)
  const BOTTOM_OFFSET = 160;

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // Carregamento inicial
  useEffect(() => {
    if (!user || !supabase) return;
    async function fetchInitialMessages() {
      try {
        const { data, error } = await supabase
          .from("resenha")
          .select("id, user_name, mensagem, created_at")
          .order("created_at", { ascending: true })
          .limit(100);
        if (error) { console.error("Erro ao buscar mensagens:", error); return; }
        setMessages(data ?? []);
      } finally {
        setFetching(false);
      }
    }
    fetchInitialMessages();
  }, [user, supabase]);

  // Realtime — novos INSERTs
  useEffect(() => {
    if (!user || !supabase) return;
    const channel = supabase
      .channel("resenha-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resenha" }, (payload) => {
        const nova = payload.new;
        if (!nova?.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === nova.id)) return prev;
          return [...prev, nova];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  // Scroll para o fundo a cada nova mensagem
  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!fetching) scrollToBottom(messages.length <= 3 ? "instant" : "smooth");
  }, [messages, fetching, scrollToBottom]);

  if (loading || !user) return <Splash />;

  const handleSend = async (e) => {
    e?.preventDefault();
    const texto = inputText.trim();
    if (!texto || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("resenha").insert({
        user_name: apelido || "Participante",
        mensagem: texto,
      });
      if (!error) setInputText("");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch { return ""; }
  };

  // Agrupa mensagens consecutivas do mesmo usuário
  const groupedMessages = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].user_name !== msg.user_name,
    isLast:  i === messages.length - 1 || messages[i + 1].user_name !== msg.user_name,
  }));

  return (
    <div className="flex flex-col relative" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      <BgFx />

      {/* ── HEADER FIXO (estilo WhatsApp) ─────────────────────────── */}
      <header
        className="relative z-20 flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0"
        style={{
          background: "rgba(10,8,22,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <Link
          href="/jogos"
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all duration-200 shrink-0"
        >
          <Home size={16} />
        </Link>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-lime-400/20">
          <MessageSquare size={18} strokeWidth={2.5} className="text-[#07060f]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-white text-base leading-none">Resenha da Copa ⚽</p>
          <p className="text-[11px] text-lime-400/80 font-medium mt-0.5 truncate">
            {fetching ? "carregando..." : `${messages.length} mensagem${messages.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Avatar do usuário logado */}
        <img
          src={`/avatares/${avatar || "1889-hamster2.png"}`}
          alt={apelido}
          className="w-9 h-9 rounded-full border-2 border-lime-400/30 object-cover bg-[#0a0816] shrink-0"
        />
      </header>

      {/* ── ÁREA DE MENSAGENS — preenche todo o espaço disponível ─── */}
      <div
        ref={messagesAreaRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: `${BOTTOM_OFFSET}px` }}
      >
        {fetching ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40">
            <Loader2 className="animate-spin text-lime-400" size={28} />
            <span className="text-xs font-bold uppercase tracking-wider">Carregando a resenha...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
            <div className="text-5xl select-none">💬</div>
            <p className="text-sm font-bold text-white/70">Nenhuma mensagem ainda</p>
            <p className="text-xs text-white/35 leading-relaxed">
              Seja o primeiro a mandar mensagem! A resenha fica salva por 24h.
            </p>
          </div>
        ) : (
          <div className="px-3 pt-4 space-y-1">
            {/* Marcador de data/aviso */}
            <div className="flex justify-center mb-4">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest bg-white/5 py-1.5 px-4 rounded-full border border-white/5 select-none">
                📅 Mensagens expiram em 24h
              </span>
            </div>

            {groupedMessages.map((msg) => {
              const isMe = msg.user_name === apelido;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${msg.isFirst ? "mt-3" : "mt-0.5"}`}
                >
                  {/* Avatar do remetente (apenas para outros, na última mensagem do grupo) */}
                  {!isMe && (
                    <div className="w-7 shrink-0 self-end mb-0.5">
                      {msg.isLast ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center text-[10px] font-extrabold text-white uppercase select-none">
                          {msg.user_name?.[0] ?? "?"}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Balão da mensagem */}
                  <div
                    style={{ maxWidth: "78%", wordBreak: "break-word" }}
                    className={`relative px-3.5 py-2.5 shadow-md ${
                      isMe
                        ? `bg-gradient-to-br from-lime-500/20 to-emerald-500/15 border border-lime-400/15 text-white ${msg.isFirst ? "rounded-t-2xl" : "rounded-2xl"} rounded-bl-2xl ${msg.isLast ? "rounded-br-sm" : "rounded-br-2xl"}`
                        : `bg-white/[0.07] border border-white/8 text-white ${msg.isFirst ? "rounded-t-2xl" : "rounded-2xl"} rounded-br-2xl ${msg.isLast ? "rounded-bl-sm" : "rounded-bl-2xl"}`
                    }`}
                  >
                    {/* Nome (apenas na 1ª msg do grupo, para outros) */}
                    {!isMe && msg.isFirst && (
                      <p className="text-lime-400 font-extrabold text-[10px] mb-1 uppercase tracking-wider leading-none">
                        {msg.user_name}
                      </p>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.mensagem}</p>

                    {/* Horário + checkmarks estilo WhatsApp */}
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                      <span className="text-[9px] text-white/30 font-mono">{formatTime(msg.created_at)}</span>
                      {isMe && (
                        <svg width="14" height="10" viewBox="0 0 14 10" className="text-lime-400/60 shrink-0">
                          <path d="M1 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* ── INPUT FIXO ACIMA DO BOTTOMNAV ─────────────────────────── */}
      <div
        className="fixed z-20 left-0 right-0"
        style={{ bottom: "72px" }}
      >
        <div
          className="px-3 py-2 border-t border-white/8"
          style={{
            background: "rgba(10,8,22,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Manda a resenha aqui... 🔥"
              maxLength={300}
              autoComplete="off"
              disabled={sending}
              className="flex-1 bg-white/8 border border-white/10 focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/20 rounded-2xl px-4 text-sm text-white placeholder-white/30 focus:outline-none transition-all duration-200"
              style={{ height: "44px" }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="w-11 h-11 bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-bold rounded-full flex items-center justify-center shrink-0 transition-all duration-200 hover:brightness-110 active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-lime-400/20"
            >
              {sending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
