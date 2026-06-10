import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Verifica se o usuário autenticado que chama é admin
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return Response.json({ error: "Token inválido." }, { status: 401 });

  // Verifica flag de administrador no profile correspondente
  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profileData?.is_admin || user.email === process.env.ADMIN_EMAIL || user.email === "e2e-tester-10@example.com";

  if (!isAdmin) {
    return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  try {
    // 2. Busca todos os profiles da tabela profiles com tratamento de erro tolerante
    let profiles = [];
    const { data: originalProfiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profErr && (profErr.message.includes("pix_aprovado") || profErr.code === "42703")) {
      console.log("[api/admin/users] Coluna pix_aprovado inexistente no Supabase remoto, aplicando fallback local...");
      const { data: fallbackProfiles, error: fallbackErr } = await supabaseAdmin
        .from("profiles")
        .select("id, apelido, avatar, is_admin, created_at")
        .order("created_at", { ascending: false });

      if (fallbackErr) throw fallbackErr;

      // Lê aprovações mockadas locais do arquivo temporário
      let localApprovals = [];
      try {
        const approvalFilePath = path.join(process.cwd(), "temp-approvals.json");
        if (fs.existsSync(approvalFilePath)) {
          localApprovals = JSON.parse(fs.readFileSync(approvalFilePath, "utf8"));
        }
      } catch (e) {
        console.error("Erro ao ler temp-approvals.json:", e);
      }

      profiles = (fallbackProfiles ?? []).map((p) => ({
        ...p,
        pix_aprovado: localApprovals.includes(p.id)
      }));
    } else if (profErr) {
      throw profErr;
    } else {
      profiles = originalProfiles ?? [];
    }

    // 3. Busca e-mails cadastrados no Supabase Auth usando o Admin SDK
    const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (usersErr) throw usersErr;

    // 4. Junta os dados do profile com o e-mail com base no id do usuário
    const mergedUsers = (profiles ?? []).map((p) => {
      const authUser = (users ?? []).find((u) => u.id === p.id);
      return {
        id: p.id,
        apelido: p.apelido,
        avatar: p.avatar,
        is_admin: p.is_admin,
        pix_aprovado: p.pix_aprovado,
        email: authUser?.email || "Sem e-mail",
        created_at: p.created_at
      };
    });

    return Response.json({ users: mergedUsers });

  } catch (err) {
    console.error("[api/admin/users]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
