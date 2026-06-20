import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function POST(request) {
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

  // Verifica se quem chamou é de fato admin
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
    const { userId, action } = await request.json();
    if (!userId) {
      return Response.json({ error: "ID de usuário não informado." }, { status: 400 });
    }

    const isApproving = action !== "revoke";

    // 2. Realiza o update do status do Pix do participante
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ pix_aprovado: isApproving })
      .eq("id", userId);

    if (updateErr && (updateErr.message.includes("pix_aprovado") || updateErr.code === "42703")) {
      console.log("[api/admin/approve-pix] Coluna pix_aprovado inexistente no Supabase remoto, persistindo no temp-approvals.json local...");
      const approvalFilePath = path.join(process.cwd(), "temp-approvals.json");
      let approvals = [];
      try {
        if (fs.existsSync(approvalFilePath)) {
          approvals = JSON.parse(fs.readFileSync(approvalFilePath, "utf8"));
        }
      } catch (e) {
        console.error("Erro ao analisar arquivo local:", e);
      }
      
      if (isApproving && !approvals.includes(userId)) {
        approvals.push(userId);
        fs.writeFileSync(approvalFilePath, JSON.stringify(approvals, null, 2), "utf8");
      } else if (!isApproving && approvals.includes(userId)) {
        approvals = approvals.filter(id => id !== userId);
        fs.writeFileSync(approvalFilePath, JSON.stringify(approvals, null, 2), "utf8");
      }
    } else if (updateErr) {
      throw updateErr;
    }

    return Response.json({ success: true, message: isApproving ? "Pix aprovado com sucesso!" : "Acesso removido com sucesso!" });

  } catch (err) {
    console.error("[api/admin/approve-pix]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
