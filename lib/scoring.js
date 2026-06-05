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
  const pa = pick ? Number(pick.score_a) : 0;
  const pb = pick ? Number(pick.score_b) : 0;

  if (pa === match.score_a && pb === match.score_b) return 3;

  const pickOutcome  = Math.sign(pa - pb);          // -1 B ganhou, 0 empate, 1 A ganhou
  const matchOutcome = Math.sign(match.score_a - match.score_b);

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
      const userPicks = picks.filter((p) => p.profile_id === profile.id);
      let points = 0, exact = 0, partial = 0;

      for (const match of finished) {
        const pick = userPicks.find((p) => p.match_id === match.id);
        const pts = scorePick(
          pick ? { score_a: pick.score_a, score_b: pick.score_b } : null,
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

export const LOCK_MS = 60 * 60 * 1000; // 1h antes trava

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
