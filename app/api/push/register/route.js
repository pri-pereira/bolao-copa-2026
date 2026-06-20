import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { subscription, profileId } = body;

    if (!subscription || !subscription.endpoint || !profileId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { keys, endpoint } = subscription;
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Chaves de assinatura ausentes' }, { status: 400 });
    }

    // Upsert na tabela push_subscriptions
    // Para evitar duplicatas do mesmo profile_id + endpoint
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        { 
          profile_id: profileId, 
          endpoint, 
          p256dh, 
          auth 
        },
        { onConflict: 'profile_id,endpoint' }
      );

    if (error) {
      console.error('Erro ao salvar subscription:', error);
      return NextResponse.json({ error: 'Erro no banco' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
