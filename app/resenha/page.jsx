"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { MessageSquare, Send, Loader2 } from "lucide-react";

export default function ResenhaPage() {
  const { user, apelido, supabase, loading } = useApp();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);

  const messagesEndRef = useRef(null);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Carregamento inicial das mensagens
  useEffect(() => {
    if (!user || !supabase) return;

    async function fetchInitialMessages() {
      try {
        const { data, error } = await supabase
          .from("resenha")
          .select("id, user_name, mensagem, created_at")
          .order("created_at", { ascending: true })
          .limit(80);

        if (error) {
          console.error("Erro ao buscar mensagens:", error);
          alert(`Erro ao carregar histórico: ${error.message}`);
          return;
        }

        setMessages(data ?? []);
      } catch (err) {
        console.error("Erro inesperado:", err);
      } finally {
        setFetching(false);
      }
    }

    fetchInitialMessages();
  }, [user, supabase]);

  // Inscrição no Realtime do Supabase — escuta novos INSERTs na tabela resenha
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase
      .channel("resenha-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resenha" },
        (payload) => {
          const nova = payload.new;
          if (!nova || !nova.id) return;
          setMessages((prev) => {
            // Evita duplicar mensagem pelo ID real do banco
            if (prev.some((m) => m.id === nova.id)) return prev;
            return [...prev, nova];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Erro na inscrição do Realtime da resenha.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Rolar para o fundo sempre que novas mensagens chegarem
  useEffect(() => {
    if (!fetching) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, fetching]);

  if (loading || !user) return <Splash />;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const texto = inputText.trim();
    if (!texto || sending) return;

    setSending(true);

    try {
      const { error } = await supabase.from("resenha").insert({
        user_name: apelido || "Participante",
        mensagem: texto,
      });

      if (error) {
        // Alert para diagnóstico caso o Supabase rejeite
        alert(`Erro ao enviar mensagem:\nCódigo: ${error.code}\nDetalhe: ${error.message}`);
        return;
      }

      // Só limpa o input após o insert bem-sucedido
      setInputText("");
    } catch (err) {
      console.error("Erro inesperado ao enviar:", err);
      alert(`Erro inesperado: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden" }}
    >
      <BgFx />

      {/* Conteúdo principal com padding-bottom para o input fixo + BottomNav */}
      <div
        className="relative mx-auto px-4"
        style={{ maxWidth: "768px", paddingBottom: "180px" }}
      >
        <PageHeader
          title="Resenha da Copa"
          sub="O espaço oficial para cornetar os palpites e zoar a galera"
          icon={<MessageSquare size={22} strokeWidth={2.5} />}
        />

        {/* Card do Chat */}
        <div
          className="glass-panel rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden"
          style={{ width: "100%" }}
        >
          {/* Luzes decorativas */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-lime-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

          {/* Área de mensagens */}
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/40">
              <Loader2 className="animate-spin text-lime-400" size={28} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Carregando a resenha...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="text-5xl mb-4 select-none">💬</div>
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                Nenhuma conversa ainda
              </h3>
              <p className="text-xs text-white/40 max-w-xs mt-2 leading-relaxed">
                Seja o primeiro a mandar mensagem! A resenha fica salva por 24h.
              </p>
            </div>
          ) : (
            <div
              className="p-4"
              style={{ overflowY: "auto", maxHeight: "60vh" }}
            >
              {/* Aviso de expiração */}
              <div className="text-center mb-4">
                <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full select-none">
                  Mensagens expiram em 24h
                </span>
              </div>

              {/* Lista de mensagens */}
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.user_name === apelido;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        style={{ maxWidth: "80%", wordBreak: "break-word" }}
                        className={`px-4 py-3 rounded-2xl border shadow-md ${
                          isMe
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100 rounded-tr-sm"
                            : "bg-white/5 border-white/5 text-white rounded-tl-sm"
                        }`}
                      >
                        {/* Nome do remetente (apenas para outros) */}
                        {!isMe && (
                          <div className="text-lime-400 font-extrabold text-[10px] mb-1.5 uppercase tracking-wider">
                            {msg.user_name}
                          </div>
                        )}
                        {/* Texto da mensagem */}
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {msg.mensagem}
                        </p>
                        {/* Horário */}
                        <div className="text-[9px] text-white/30 mt-1.5 text-right font-mono">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Barra de digitação — fixada acima do BottomNav, ocupa 100% da largura */}
      <div
        className="fixed z-20"
        style={{ bottom: "80px", left: 0, right: 0 }}
      >
        <div className="px-4 mx-auto" style={{ maxWidth: "768px" }}>
          <form
            onSubmit={handleSendMessage}
            className="flex gap-2 rounded-2xl border border-white/10 p-2"
            style={{
              background: "rgba(10,8,22,0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e);
              }}
              placeholder="Manda a resenha aqui... 🔥"
              maxLength={300}
              autoComplete="off"
              className="flex-1 bg-white/5 border border-white/5 focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/20 rounded-xl px-4 text-sm text-white placeholder-white/30 focus:outline-none transition-all duration-200"
              style={{ minHeight: "44px" }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-bold rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-lg"
              style={{ width: "48px", height: "44px" }}
              title="Enviar"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} strokeWidth={2.5} />
              )}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
