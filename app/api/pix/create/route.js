import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Preço da inscrição do Bolão definido e fixado com segurança no backend
const TICKET_PRICE = Number(process.env.TICKET_PRICE) || 20.00;

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validação básica do email
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório para gerar o Pix.' }, { status: 400 });
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': crypto.randomUUID() // Proteção contra requisições duplicadas
      },
      body: JSON.stringify({
        transaction_amount: TICKET_PRICE,
        description: 'Inscrição Bolão Copa 2026',
        payment_method_id: 'pix',
        payer: {
          email: email
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao gerar o Pix junto ao provedor.');
    }

    // Retorna apenas os dados cruciais para o front-end
    return NextResponse.json({
      paymentId: data.id,
      qrCode: data.point_of_interaction.transaction_data.qr_code,        // Texto Copia e Cola
      qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64 // Imagem do QR Code
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

