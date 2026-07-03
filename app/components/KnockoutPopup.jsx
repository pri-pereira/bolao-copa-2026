"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";

export default function KnockoutPopup() {
  const { user } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Só mostramos o aviso se o usuário estiver logado
    if (!user) return;

    // Chave de controle no localStorage
    const storageKey = "aviso_mata_mata_v1";
    const hasSeen = localStorage.getItem(storageKey);

    // Definimos o limite de 24h desde o início da campanha
    // 29/06/2026 23:59:59 UTC ou similar, 
    // mas o mais simples é ver se já se passaram 24h da criação do aviso.
    // Para simplificar: aparece se ainda não viu.
    // Opcional: checar se a data atual é até 24h de hoje.
    const now = Date.now();
    // Exemplo: campanha acaba em 30 de junho de 2026 (fuso local)
    // Aqui usaremos uma expiração de 24h na própria chave, ou apenas "já viu" = não mostra mais.
    
    if (!hasSeen) {
      setShow(true);
    }
  }, [user]);

  const handleClose = () => {
    // Marcamos que o usuário já viu
    localStorage.setItem("aviso_mata_mata_v1", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1e1e1e] border border-green-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Efeito de brilho de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-green-500/10 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-outfit">O Mata-Mata Começou!</h2>
          <p className="text-white/80 mb-6 text-sm leading-relaxed">
            A tabela das eliminatórias foi atualizada com os novos confrontos e horários. 
            Não perca tempo, acesse a página de palpites e deixe suas apostas para a fase decisiva da Copa do Mundo!
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Fazer Meus Palpites Agora
          </button>
        </div>
      </div>
    </div>
  );
}
