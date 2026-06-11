"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { MessageSquare, Send, Loader2 } from "lucide-react";

export default function ResenhaPage() {
  const { user, profile, apelido, supabase, loading } = useApp();
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
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) throw error;

        // Inverter para mostrar em ordem cronológica (mais antigas no topo, mais recentes no fim)
        const cronMessageList = data ? [...data].reverse() : [];
        setMessages(cronMessageList);
      } catch (err) {
        console.error("Erro ao carregar histórico da resenha:", err);
      } finally {
        setFetching(false);
      }
    }

    fetchInitialMessages();
  }, [user, supabase]);

  // Inscrição no canal de Realtime do Supabase
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase
      .channel("realtime-resenha")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resenha" },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Evita duplicar se já foi adicionada localmente
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Rolar para baixo sempre que novas mensagens forem adicionadas ou o histórico for carregado
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, fetching]);

  if (loading || !user) return <Splash />;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const msgToSend = inputText.trim();
    setInputText(""); // Limpa o input imediatamente para melhor UX

    try {
      const { error } = await supabase
        .from("resenha")
        .insert({
          user_name: apelido || "Participante",
          mensagem: msgToSend
        });

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      // Se falhar, restaura o texto digitado
      setInputText(msgToSend);
    } finally {
      setSending(false);
    }
  };

  // Formata timestamp em formato hora local simplificado (ex: 14:35)
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    });
  };

  return (
    <div className="min-h-screen relative">
      <BgFx />
      
      <div className="relative max-w-3xl mx-auto px-4 pb-48">
        <PageHeader 
          title="Resenha da Copa" 
          sub="O espaço oficial para cornetar os palpites e zoar a galera" 
          icon={<MessageSquare size={22} strokeWidth={2.5} />} 
        />

        {/* Container do Chat */}
        <div className="glass-panel rounded-3xl p-4 sm:p-6 min-h-[400px] flex flex-col justify-between border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Luzes decorativas de fundo do card */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-lime-500/[0.03] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

          {/* Histórico do Chat */}
          {fetching ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-white/40">
              <Loader2 className="animate-spin text-lime-400" size={28} />
              <span className="text-xs font-bold uppercase tracking-wider">Carregando a resenha...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="text-4xl mb-3 select-none">💬</div>
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">Nenhuma conversa por aqui</h3>
              <p className="text-xs text-white/40 max-w-xs mt-1 leading-relaxed">
                Seja o primeiro a mandar uma mensagem! A resenha fica salva por 24h.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-4">
              <div className="text-center text-[10px] text-white/30 font-bold uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full w-max mx-auto mb-2 select-none">
                As mensagens expiram em 24h
              </div>
              
              {messages.map((msg) => {
                const isMe = msg.user_name === apelido;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                      {/* Balão de Mensagem */}
                      <div className={`px-4 py-2.5 rounded-2xl border text-sm font-medium shadow-md leading-relaxed break-words w-full ${
                        isMe 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100 rounded-tr-none" 
                          : "bg-white/5 border-white/5 text-white rounded-tl-none"
                      }`}>
                        {/* Nome do Jogador */}
                        {!isMe && (
                          <div className="text-lime-400 font-extrabold text-[10px] mb-1 uppercase tracking-wider leading-none">
                            {msg.user_name}
                          </div>
                        )}
                        <p className="whitespace-pre-line text-xs sm:text-sm">{msg.mensagem}</p>
                        
                        {/* Hora do Envio */}
                        <div className="text-[9px] text-white/35 mt-1.5 leading-none text-right font-mono">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input de Mensagem Fixo acima da BottomNav */}
      <div className="fixed bottom-24 left-0 right-0 z-20 px-4 max-w-3xl mx-auto">
        <form onSubmit={handleSendMessage} className="glass-panel p-2.5 rounded-2xl border border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] flex gap-2"
          style={{ background: "rgba(10,8,22,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem na resenha..."
            maxLength={300}
            className="flex-1 bg-white/5 border border-white/5 hover:border-white/10 focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none transition-all duration-200"
            disabled={sending || fetching}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending || fetching}
            className="bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] p-2.5 rounded-xl hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 flex items-center justify-center shrink-0 shadow-lg shadow-lime-400/10"
            title="Enviar mensagem"
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} strokeWidth={2.5} />}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
