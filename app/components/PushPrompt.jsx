"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { useApp } from "../providers";

// Chave pública (VAPID) para registrar push
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt() {
  const { user } = useApp();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    // Só mostra se for suportado e se o usuário está logado
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setPermission(Notification.permission);
      
      // Se não perguntou ainda e o usuário fechou o prompt nesta sessão, respeita
      const hidePrompt = sessionStorage.getItem("hidePushPrompt");
      
      if (Notification.permission === "default" && !hidePrompt && user) {
        // Atrasar a exibição para não assustar o usuário logo no carregamento
        const t = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [user]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === "granted") {
        const registration = await navigator.serviceWorker.ready;
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
          });
        }

        // Enviar para o servidor
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription, profileId: user.id }),
        });
        
        setShow(false);
      }
    } catch (err) {
      console.error("Erro ao registrar notificação:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("hidePushPrompt", "true");
    setShow(false);
  };

  if (!show || permission !== "default") return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in sm:w-[400px] sm:left-1/2 sm:-translate-x-1/2">
      <div className="bg-[#0f0e1a] border border-lime-500/30 rounded-2xl p-4 shadow-2xl shadow-lime-500/10 flex items-start gap-3">
        <div className="bg-lime-500/10 p-2 rounded-xl shrink-0 text-lime-400">
          <Bell size={20} strokeWidth={2.5} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm mb-1">Não perca o horário!</h3>
          <p className="text-white/60 text-xs leading-relaxed mb-3">
            Ative as notificações para receber lembretes dos jogos que você ainda não palpitou.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="bg-lime-400 hover:bg-lime-300 text-black text-[10px] font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[100px]"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Ativar Lembretes"}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2"
            >
              Agora Não
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-white/20 hover:text-white shrink-0 -mt-1 -mr-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
