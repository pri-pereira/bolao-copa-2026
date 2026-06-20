import { NextResponse } from 'next/server';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const tokenUrl = searchParams.get('token');

  // Segurança 1: Verifica se a chamada possui a sua chave secreta na URL
  if (tokenUrl !== process.env.WEBHOOK_SECRET) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  try {
    const body = await request.json();

    // O Mercado Pago avisa sobre atualizações de pagamento com a propriedade 'action'
    if (body.action === 'payment.created' || body.action === 'payment.updated') {
      const paymentId = body.data.id;

      // Segurança 2: Consulta o Mercado Pago de forma reversa usando o ID recebido
      const lookupResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });

      const paymentData = await lookupResponse.json();

      // Verifica se o pagamento foi realmente aprovado
      if (lookupResponse.ok && paymentData.status === 'approved') {
        const payerEmail = paymentData.payer.email;
        const totalPaid = paymentData.transaction_amount;

        // =========================================================
        // COLOQUE SUA LÓGICA DE LIBERAÇÃO DO SISTEMA AQUI
        // Ex: Atualizar a tabela de usuários no banco de dados
        // =========================================================
        console.log(`Sucesso! Usuário ${payerEmail} pagou R$ ${totalPaid}`);
      }
    }

    // Sempre retorne status 200 para o Mercado Pago saber que você recebeu o aviso
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Erro ao processar Webhook:', error);
    return new NextResponse('Erro Interno', { status: 500 });
  }
}
