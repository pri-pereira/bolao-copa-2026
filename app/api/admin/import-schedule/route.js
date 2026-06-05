import { createClient } from "@supabase/supabase-js";
import { matchesData } from "@/lib/copa2026-data";

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Verifica se o usuário autenticado é admin
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return Response.json({ error: "Token inválido." }, { status: 401 });

  const { data: profileData } = await supabaseAdmin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profileData?.is_admin) return Response.json({ error: "Sem permissão." }, { status: 403 });

  // 2. Importa a tabela do arquivo local
  try {
    const records = matchesData.map((m) => ({
      id:             m.id,
      team_a:         m.team_a,
      team_b:         m.team_b,
      flag_a:         m.flag_a,
      flag_b:         m.flag_b,
      match_datetime: m.match_datetime,
      group_name:     m.group_name,
      finished:       false,
    }));

    // 3. Upsert no Supabase (atualiza se o id já existir)
    const { error: upsertErr } = await supabaseAdmin
      .from("matches")
      .upsert(records, { onConflict: "id" });

    if (upsertErr) throw upsertErr;

    return Response.json({ imported: records.length, message: "Tabela importada com sucesso a partir do arquivo local da Copa!" });

  } catch (err) {
    console.error("[import-schedule]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
