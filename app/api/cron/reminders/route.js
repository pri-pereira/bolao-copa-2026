import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  'mailto:priscillasantosp24@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.nextUrl.searchParams.get('key') !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Pegar jogos abertos de hoje
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Jogos de hoje, não finalizados
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id, match_datetime, team_a, team_b')
      .eq('finished', false)
      .gte('match_datetime', `${todayStr}T00:00:00Z`)
      .lte('match_datetime', `${todayStr}T23:59:59Z`);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'Nenhum jogo aberto hoje.' });
    }

    // 2. Pegar todas as assinaturas ativas e perfis aprovados
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, profile_id, profiles!inner(pix_aprovado, is_admin)')
      .or('pix_aprovado.eq.true,is_admin.eq.true', { foreignTable: 'profiles' });

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'Nenhuma assinatura de push ativa.' });
    }

    // Agrupar assinaturas por profile_id
    const subsByProfile = {};
    for (const sub of subs) {
      if (!subsByProfile[sub.profile_id]) subsByProfile[sub.profile_id] = [];
      subsByProfile[sub.profile_id].push(sub);
    }

    // 3. Checar os palpites de cada usuário
    const profileIds = Object.keys(subsByProfile);
    const { data: picks } = await supabaseAdmin
      .from('picks')
      .select('profile_id, match_id')
      .in('profile_id', profileIds)
      .in('match_id', matches.map(m => m.id));

    const picksSet = new Set(picks?.map(p => `${p.profile_id}_${p.match_id}`) || []);

    let sentCount = 0;
    const errors = [];

    // 4. Disparar notificação para quem está faltando palpite
    for (const profileId of profileIds) {
      const missingMatches = matches.filter(m => !picksSet.has(`${profileId}_${m.id}`));

      if (missingMatches.length > 0) {
        const payload = JSON.stringify({
          title: 'Bolão da Copa',
          body: `⚠️ Você tem ${missingMatches.length} jogo(s) hoje sem palpite! Corra lá antes que bloqueie!`,
          url: '/jogos'
        });

        for (const sub of subsByProfile[profileId]) {
          const pushSub = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          try {
            await webpush.sendNotification(pushSub, payload);
            sentCount++;
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              // Assinatura expirou ou foi cancelada no celular
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            } else {
              errors.push(err.message);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, sentCount, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
