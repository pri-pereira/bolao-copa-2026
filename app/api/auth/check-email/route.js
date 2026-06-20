import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email não fornecido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Lista os usuários na base do Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Procura se existe algum usuário com o email especificado (case-insensitive)
    const exists = (users ?? []).some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    return NextResponse.json({ exists });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
