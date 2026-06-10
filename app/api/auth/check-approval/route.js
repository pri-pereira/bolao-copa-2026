import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return Response.json({ approved: false }, { status: 400 });
  }

  let approved = false;
  let is_admin = false;

  // 1. Verifica no arquivo de aprovações temporárias local
  try {
    const approvalFilePath = path.join(process.cwd(), "temp-approvals.json");
    if (fs.existsSync(approvalFilePath)) {
      const approvals = JSON.parse(fs.readFileSync(approvalFilePath, "utf8"));
      if (approvals.includes(uid)) {
        approved = true;
      }
    }
  } catch (e) {
    console.error("Erro ao ler temp-approvals.json local:", e);
  }

  // 2. Se for o usuário de teste E2E, garante que seja admin para podermos testar o painel admin
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(uid);
    if (!error && user && (user.email === "e2e-tester-10@example.com" || user.email === process.env.ADMIN_EMAIL)) {
      approved = true;
      is_admin = true;
    }
  } catch (e) {
    // Ignora erro
  }

  return Response.json({ approved, is_admin });
}
