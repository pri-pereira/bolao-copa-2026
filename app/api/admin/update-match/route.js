import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * API Route segura para o Admin gerenciar jogos.
 * Usa SUPABASE_SERVICE_ROLE_KEY para bypassar RLS.
 * Todas as ações exigem autenticação de admin.
 * 
 * Ações: insert, save_score, finish, reopen, delete
 */
export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Verifica autenticação
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  // 2. Verifica se é admin
  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profileData?.is_admin && user.email !== 'priscillasantosp24@gmail.com') {
    return NextResponse.json({ error: "Sem permissão de administrador." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // ── Inserir novo jogo ──
      case "insert": {
        const { match } = body;
        if (!match?.team_a || !match?.team_b || !match?.match_datetime) {
          return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
        }
        const { error } = await supabaseAdmin.from("matches").insert({
          team_a: match.team_a,
          team_b: match.team_b,
          flag_a: match.flag_a || "⚽",
          flag_b: match.flag_b || "⚽",
          match_datetime: match.match_datetime,
          group_name: match.group_name || null,
          finished: false,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: "Jogo adicionado." });
      }

      // ── Salvar placar (sem encerrar) ──
      case "save_score": {
        const { matchId, score_a, score_b } = body;
        if (matchId == null || score_a == null || score_b == null) {
          return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("matches")
          .update({ score_a: Number(score_a), score_b: Number(score_b) })
          .eq("id", matchId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: "Placar salvo." });
      }

      // ── Encerrar jogo (salva placar + marca finished) ──
      case "finish": {
        const { matchId, score_a, score_b } = body;
        if (matchId == null || score_a == null || score_b == null) {
          return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("matches")
          .update({
            score_a: Number(score_a),
            score_b: Number(score_b),
            finished: true,
          })
          .eq("id", matchId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: "Jogo encerrado." });
      }

      // ── Reabrir jogo ──
      case "reopen": {
        const { matchId } = body;
        if (matchId == null) {
          return NextResponse.json({ error: "ID do jogo não fornecido." }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("matches")
          .update({ finished: false })
          .eq("id", matchId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: "Jogo reaberto." });
      }

      // ── Excluir jogo ──
      case "delete": {
        const { matchId } = body;
        if (matchId == null) {
          return NextResponse.json({ error: "ID do jogo não fornecido." }, { status: 400 });
        }
        // Remove palpites associados antes de excluir o jogo
        await supabaseAdmin.from("picks").delete().eq("match_id", matchId);
        const { error } = await supabaseAdmin.from("matches").delete().eq("id", matchId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: "Jogo removido." });
      }

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin/update-match]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
