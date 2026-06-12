"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { BottomNav, PageHeader } from "../components";
import { BgFx, Splash } from "../page";
import { BookOpen, Trophy, Clock, CheckCircle2, AlertTriangle, Coins } from "lucide-react";

export default function RegrasPage() {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading]);

  if (loading || !user) return <Splash />;

  return (
    <div className="min-h-screen relative">
      <BgFx />
      <div className="relative max-w-3xl mx-auto px-4 pb-36">
        <PageHeader 
          title="Regras do Bolão" 
          sub="Entenda como funciona o sistema de pontos e prazos do Bolão da Vidros" 
          icon={<BookOpen size={22} strokeWidth={2.5} />} 
        />

        <div className="space-y-6">
          {/* Card Premiação */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/[0.02] rounded-full blur-2xl pointer-events-none" />
            <h2 className="font-display text-xl text-yellow-400 mb-4 flex items-center gap-2">
              <Coins size={20} className="text-yellow-400" />
              Premiação Máxima (Valor Integral)
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-white/80 font-medium">
                Aqui não tem taxa administrativa!
              </p>
              <div className="flex items-start gap-3.5 bg-yellow-400/5 border border-yellow-400/15 rounded-2xl p-4">
                <div className="text-2xl select-none">🏆</div>
                <div>
                  <h3 className="font-extrabold text-sm text-yellow-300 uppercase tracking-wide">O vencedor leva 100%!</h3>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    O prêmio final será o valor integral equivalente ao número total de participantes × R$ 10,00. Quanto mais gente da fábrica entrar, maior será a bolada!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="text-2xl select-none">🤝</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white/90 uppercase tracking-wide">Regra de Empate</h3>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Se a Copa terminar e houver empate na liderança do ranking, o valor total acumulado será dividido igualmente entre os primeiros colocados.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Sistema de Pontos */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-lime-500/[0.02] rounded-full blur-2xl pointer-events-none" />
            <h2 className="font-display text-xl text-gradient-neon mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-lime-400" />
              Sistema de Pontuação
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 bg-lime-400/5 border border-lime-400/15 rounded-2xl p-4">
                <div className="text-2xl select-none">🎯</div>
                <div>
                  <h3 className="font-extrabold text-sm text-lime-300 uppercase tracking-wide">Placar Exato — 3 Pontos</h3>
                  <p className="text-xs text-white/60 mt-1">Você ganha a pontuação máxima se acertar o placar exato da partida. <br/><i>Exemplo: Palpite 2 × 1 e o jogo terminou 2 × 1.</i></p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="text-2xl select-none">👍</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white/90 uppercase tracking-wide">Acertou o Vencedor — 1 Ponto</h3>
                  <p className="text-xs text-white/60 mt-1">Você acertou qual time venceu, mas errou a quantidade exata de gols. <br/><i>Exemplo: Palpite 3 × 1 e o jogo terminou 2 × 0.</i></p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="text-2xl select-none">🤝</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white/90 uppercase tracking-wide">Acertou o Empate — 1 Ponto</h3>
                  <p className="text-xs text-white/60 mt-1">Você apostou em empate e a partida terminou empatada (mesmo que com quantidade de gols diferente). <br/><i>Exemplo: Palpite 1 × 1 e o jogo terminou 2 × 2.</i></p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Trava de Segurança */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/[0.02] rounded-full blur-2xl pointer-events-none" />
            <h2 className="font-display text-xl text-gradient-orange mb-4 flex items-center gap-2">
              <Clock size={20} className="text-orange-400" />
              Prazos e Bloqueio
            </h2>
            <div className="space-y-3.5 text-xs text-white/70 leading-relaxed font-medium">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/5 p-3 rounded-xl">
                <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
                <span>Você pode alterar seus palpites quantas vezes quiser até **15 minutos antes** do início do jogo.</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/5 p-3 rounded-xl">
                <Clock size={16} className="text-orange-400 shrink-0" />
                <span>Faltando exatamente **15 minutos** para o início do jogo, os palpites serão **travados** e ninguém mais poderá alterá-los.</span>
              </div>
            </div>
          </div>

          {/* Card Palpite Automático */}
          <div className="glass-panel rounded-3xl p-6 border-amber-500/25 bg-amber-500/[0.02] relative overflow-hidden">
            <h2 className="font-display text-xl text-amber-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-400" />
              Esqueceu de Palpitar?
            </h2>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              Não se preocupe se esquecer de salvar o placar a tempo. A regra oficial do bolão estabelece que, **ao travar o jogo, se o participante estiver sem palpite, o sistema escolherá automaticamente o placar de 0 × 0 como sua aposta**.
            </p>
            <div className="mt-3 text-[11px] font-bold text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/10">
              💡 Dica: Fique atento aos alertas piscantes de <span className="bg-amber-500 text-[#07060f] px-1 py-0.5 rounded text-[10px]">⚠️ Palpitar!</span> nos cards de jogos abertos!
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
