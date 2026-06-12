/**
 * Calcula os pontos de um palpite comparado ao resultado real.
 * - 3 pts: placar exato
 * - 1 pt:  acertou o vencedor OU acertou que era empate
 * - 0 pts: errou
 *
 * Se pick for null/undefined, vale 0 × 0 (regra automática).
 */
export function scorePick(pick, match) {
  if (!match || match.score_a == null || match.score_b == null) return null;

  // Se o participante não salvou palpite, o sistema assume automaticamente 0 x 0
  const pa = pick && pick.score_a != null ? Number(pick.score_a) : 0;
  const pb = pick && pick.score_b != null ? Number(pick.score_b) : 0;
  
  const ma = Number(match.score_a);
  const mb = Number(match.score_b);

  if (pa === ma && pb === mb) return 3;

  const pickOutcome  = Math.sign(pa - pb);          // -1 B ganhou, 0 empate, 1 A ganhou
  const matchOutcome = Math.sign(ma - mb);

  if (pickOutcome === matchOutcome) return 1;
  return 0;
}

/**
 * Calcula o ranking completo a partir de perfis, palpites e jogos.
 */
export function computeRanking(profiles, picks, matches) {
  const finished = matches.filter((m) => m.finished);

  return profiles
    .map((profile) => {
      const userPicks = picks.filter((p) => String(p.profile_id) === String(profile.id));
      let points = profile.points_offset || 0;
      let exact = profile.exact_offset || 0;
      let partial = profile.partial_offset || 0;

      for (const match of finished) {
        const pick = userPicks.find((p) => String(p.match_id) === String(match.id));
        
        const pa = pick && pick.score_a != null ? Number(pick.score_a) : 0;
        const pb = pick && pick.score_b != null ? Number(pick.score_b) : 0;
        const ma = Number(match.score_a);
        const mb = Number(match.score_b);
        
        console.log(`Calculando jogo ${match.id} para ${profile.apelido}: Palpite [${pa}x${pb}] vs Real [${ma}x${mb}]`);
        
        const pts = scorePick(
          pick ? { score_a: pa, score_b: pb } : null,
          match
        );
        if (pts === 3) { points += 3; exact++; }
        else if (pts === 1) { points += 1; partial++; }
      }

      return { ...profile, points, exact, partial };
    })
    .sort((a, b) => b.points - a.points || b.exact - a.exact);
}

/** Formata data/hora para pt-BR */
export function fmtDT(iso) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export const LOCK_MS = 15 * 60 * 1000; // 15 minutos antes trava

/** Converte sigla de país de 2 letras (ex: MX, BR) em emoji de bandeira */
export function getFlagEmoji(flag) {
  if (!flag) return "⚽";
  if (flag.length !== 2 || !/^[A-Za-z]{2}$/.test(flag)) {
    return flag;
  }
  try {
    const codePoints = flag
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return flag;
  }
}

export function emojiToCountryCode(emoji) {
  if (!emoji) return null;
  if (/^[A-Za-z]{2}$/.test(emoji)) {
    return emoji.toLowerCase();
  }
  if (emoji === "🏴󠁧󠁢󠁳󠁣󠁴󠁿" || emoji.includes("🏴󠁧󠁢󠁳󠁣󠁴󠁿") || emoji.includes("sct")) {
    return "gb-sct";
  }
  if (emoji === "🏴󠁧󠁢󠁥󠁮%e0" || emoji.includes("🏴󠁧󠁢󠁥󠁮󠁧󠁿") || emoji.includes("eng")) {
    // Tratamento especial para o emoji da Inglaterra
    return "gb-eng";
  }
  if (emoji === "🏴󠁧󠁢󠁷󠁬󠁳󠁿" || emoji.includes("🏴󠁧󠁢󠁷󠁬󠁳󠁿") || emoji.includes("wls")) {
    return "gb-wls";
  }
  const chars = [...emoji];
  if (chars.length < 2) return null;
  try {
    const codeA = chars[0].codePointAt(0) - 127397;
    const codeB = chars[1].codePointAt(0) - 127397;
    if (codeA >= 65 && codeA <= 90 && codeB >= 65 && codeB <= 90) {
      return (String.fromCharCode(codeA) + String.fromCharCode(codeB)).toLowerCase();
    }
  } catch {
    return null;
  }
  return null;
}

export function renderFlag(flag, className = "w-10 h-7 object-cover rounded shadow-md") {
  const code = emojiToCountryCode(flag);
  if (code) {
    return (
      <img 
        src={`https://flagcdn.com/w80/${code}.png`} 
        alt={flag} 
        className={className} 
        loading="lazy"
      />
    );
  }
  return <span className="text-2xl select-none">{flag || "⚽"}</span>;
}
