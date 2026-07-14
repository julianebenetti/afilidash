// netlify/functions/comissao-scheduled.js — AffiliDash v3
// Roda sozinho (agendado via netlify.toml, sem clique de ninguém). Faz a mesma
// verificação do botão manual (comissao.js) e, se achar queda de comissão nova,
// manda um e-mail de alerta pra cada produto via EmailJS (API REST, server-side).

const { buscarDetalhesProduto, verificarComissoes } = require('./_comissaoCore');

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const ND = 'N/D'; // "não disponível" — nunca estima, só marca quando falta o dado

function fmtPct(n) { return n == null ? ND : Number(n).toFixed(1); }
function fmtBrl(n) { return n == null ? ND : Number(n).toFixed(2); }

async function enviarEmailAlerta(templateParams) {
  const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
    throw new Error('Variáveis de ambiente do EmailJS não configuradas no Netlify');
  }
  const res = await fetch(EMAILJS_SEND_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:      EMAILJS_SERVICE_ID,
      template_id:     EMAILJS_TEMPLATE_ID,
      user_id:         EMAILJS_PUBLIC_KEY,
      accessToken:     EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => String(res.status));
    throw new Error(`EmailJS HTTP ${res.status}: ${txt}`);
  }
}

// Monta os parâmetros do template a partir do que temos garantido (comissão) +
// o que for possível enriquecer (nome, preço, link). Campos que a API não
// devolver viram "N/D" — nunca inventa/estima valor.
async function montarEmailAlerta(alerta) {
  const { shopId, itemId, comissaoAnterior, comissaoAtual, contaApi } = alerta;
  const detalhes = await buscarDetalhesProduto(contaApi.appId, contaApi.secret, shopId, itemId);

  const price = detalhes?.price ?? detalhes?.priceMin ?? null;
  const commissionValue = (price != null) ? (Number(price) * (comissaoAtual / 100)) : null;

  return {
    product_name:     detalhes?.productName || ND,
    shop_name:        detalhes?.shopName || ND,
    price:            fmtBrl(price),
    old_commission:   fmtPct(comissaoAnterior),
    new_commission:   fmtPct(comissaoAtual),
    delta:            (comissaoAnterior != null) ? fmtPct(comissaoAtual - comissaoAnterior) : ND,
    commission_value: fmtBrl(commissionValue),
    seller_pct:       detalhes?.sellerCommissionRate != null ? fmtPct(Number(detalhes.sellerCommissionRate) * 100) : ND,
    shopee_pct:       detalhes?.shopeeCommissionRate != null ? fmtPct(Number(detalhes.shopeeCommissionRate) * 100) : ND,
    product_link:     detalhes?.productLink || detalhes?.offerLink || `https://shopee.com.br/product/${shopId}/${itemId}`,
  };
}

exports.handler = async () => {
  try {
    const resultado = await verificarComissoes();
    if (resultado.error) {
      console.warn('comissao-scheduled: não rodou —', resultado.error);
      return { statusCode: 200, body: JSON.stringify({ ok: false, pulou: resultado.error }) };
    }

    const alertas = resultado.alertasDetalhados || [];
    let emailsEnviados = 0;
    const errosEmail = [];

    for (const alerta of alertas) {
      try {
        const params = await montarEmailAlerta(alerta);
        await enviarEmailAlerta(params);
        emailsEnviados++;
      } catch (e) {
        errosEmail.push(`${alerta.shopId}/${alerta.itemId}: ${e.message}`);
        console.warn('Falha ao enviar e-mail de alerta:', e.message);
      }
    }

    console.log(`comissao-scheduled: ${resultado.verificados} verificados, ${resultado.alertas_novos} alertas, ${emailsEnviados} e-mail(s) enviado(s)`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: resultado.ok,
        verificados:    resultado.verificados,
        alertas_novos:  resultado.alertas_novos,
        emails_enviados: emailsEnviados,
        erros_email:    errosEmail,
        erros:          resultado.erros,
      }),
    };
  } catch (err) {
    console.error('comissao-scheduled error:', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
