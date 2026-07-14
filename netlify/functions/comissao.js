// netlify/functions/comissao.js — AffiliDash v3
// Disparo MANUAL (botão "Atualizar Meta Ads" no frontend). A lógica de
// verificação em si mora em _comissaoCore.js, compartilhada com
// comissao-scheduled.js (que roda sozinho, sem clique).

const { base, sbHeaders, verificarComissoes } = require('./_comissaoCore');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Apenas POST' }) };

  const acao = (event.queryStringParameters || {}).action;

  // ── Confirma que já viu o alerta de queda de um produto específico ──
  // Não apaga o histórico (comissao_anterior) nem o alerta_ativo — só marca
  // como visto. Uma queda NOVA num ciclo futuro reabre (confirmado=false de novo).
  if (acao === 'confirmar') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { shop_id, item_id } = body;
      if (!shop_id || !item_id)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'shop_id e item_id obrigatórios' }) };

      const res = await fetch(
        `${base()}/shopee_comissao_cache?shop_id=eq.${encodeURIComponent(shop_id)}&item_id=eq.${encodeURIComponent(item_id)}`,
        {
          method:  'PATCH',
          headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ confirmado: true }),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => String(res.status));
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: txt }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
  }

  // ── Comportamento padrão: roda a verificação completa de comissões ──
  try {
    const resultado = await verificarComissoes();
    if (resultado.error) {
      return { statusCode: 400, headers, body: JSON.stringify(resultado) };
    }
    // alertasDetalhados é uso interno do scheduled — não precisa ir pro frontend
    const { alertasDetalhados, ...resposta } = resultado;
    return { statusCode: 200, headers, body: JSON.stringify(resposta) };
  } catch (err) {
    console.error('Comissão error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
