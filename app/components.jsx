"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Goal, ListOrdered, ShieldCheck, LogOut, BookOpen, Clock, X, Sun, Moon } from "lucide-react";
import { useApp } from "./providers";

export function BottomNav() {
  const { profile, signOut } = useApp();
  const path = usePathname();

  const tabs = [
    { href: "/jogos",   label: "Jogos",   icon: Goal },
    { href: "/ranking", label: "Ranking", icon: ListOrdered },
    { href: "/regras",  label: "Regras",  icon: BookOpen },
    ...(profile?.is_admin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
      <div className="max-w-3xl mx-auto mx-4 mb-4 flex gap-1.5 rounded-2xl border border-white/5 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
        style={{ background: "rgba(10,8,22,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-200 ${active ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-[#07060f] font-extrabold shadow-lg shadow-lime-400/15" : "text-white/45 hover:text-white hover:bg-white/5"}`}>
              <Icon size={18} strokeWidth={active ? 2.8 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
        <button onClick={signOut}
          className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-white/45 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <LogOut size={18} strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
        </button>
      </div>
    </nav>
  );
}

export function DateTimeClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }));
      setDate(now.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return <div className="text-right text-xs text-white/20 select-none">...</div>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl backdrop-blur-md select-none shrink-0">
      <div className="flex items-center gap-1.5 text-lime-400 font-display text-lg tracking-wider font-extrabold">
        <Clock size={15} className="animate-pulse shrink-0" />
        <span>{time}</span>
      </div>
      <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
        {date} <span className="text-[9px] bg-lime-400/10 text-lime-300 px-1 py-0.2 rounded ml-0.5">DF</span>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, icon }) {
  const { apelido, avatar, updateAvatar, theme, toggleTheme } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [avatares, setAvatares] = useState([]);

  useEffect(() => {
    if (showModal) {
      async function load() {
        try {
          const res = await fetch("/api/avatares");
          const json = await res.json();
          if (json.avatares) setAvatares(json.avatares);
        } catch (e) {
          console.error("Erro ao buscar avatares:", e);
        }
      }
      load();
    }
  }, [showModal]);

  const selectAvatar = async (file) => {
    await updateAvatar(file);
    setShowModal(false);
  };

  const activeAvatar = avatar || "1889-hamster2.png";

  return (
    <header className="pt-8 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 mb-8 relative">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-[#07060f] flex items-center justify-center shadow-[0_0_25px_rgba(163,230,53,0.2)]">
          {icon}
        </div>
        <div>
          <h1 className="font-display text-3xl text-white leading-none tracking-tight">{title}</h1>
          {sub && <p className="text-white/50 text-xs font-medium mt-1">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-lime-400/25 text-lime-400 transition-all duration-200"
          title="Alternar Tema"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-lime-400/25 px-3 py-1.5 rounded-xl cursor-pointer select-none transition-all duration-200 animate-fade-in"
        >
          <img 
            src={`/avatares/${activeAvatar}`} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full border border-white/10 object-cover bg-[#0a0816]" 
          />
          <div className="flex flex-col items-start justify-center">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Jogador</span>
            <span className="text-xs font-extrabold text-lime-400 mt-1 leading-none truncate max-w-[100px]">{apelido || "..."}</span>
          </div>
        </div>
        <DateTimeClock />
      </div>

      {/* Modal de Escolha de Avatar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 relative border border-white/10 shadow-2xl">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/45 hover:text-white hover:bg-white/5 p-1.5 rounded-xl transition-all duration-200"
            >
              <X size={18} />
            </button>
            <h3 className="font-display text-2xl text-white mb-1.5">Escolha seu Avatar</h3>
            <p className="text-white/50 text-xs mb-5 font-medium">Os arquivos suportam formatos .png e .gif</p>
            
            <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1 pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {avatares.map((file) => {
                const isSelected = activeAvatar === file;
                const label = file.replace(/^\d+-/, "").replace(/\.[^/.]+$/, "").replace(/-/g, " ");
                return (
                  <button
                    key={file}
                    onClick={() => selectAvatar(file)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-200 ${
                      isSelected 
                        ? "bg-lime-400/10 border-lime-400 text-lime-300 shadow-md shadow-lime-400/10" 
                        : "bg-white/5 border-white/5 hover:border-white/15 text-white/60 hover:text-white"
                    }`}
                  >
                    <img 
                      src={`/avatares/${file}`} 
                      alt={label} 
                      className="w-10 h-10 rounded-full object-cover bg-[#0a0816] shadow-md border border-white/5" 
                    />
                    <span className="text-[8px] font-bold truncate max-w-full uppercase tracking-wider">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
