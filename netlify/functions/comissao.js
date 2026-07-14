// netlify/functions/comissao.js — AffiliDash v3
// Responsabilidade: verificar a comissão por PRODUTO na Shopee (productOfferV2)
// pra cada campanha ativa com link salvo, comparar com a última leitura e
// gravar alerta de queda em shopee_comissao_cache.
// Disparado manualmente por enquanto (botão no frontend) — sem agendamento ainda.

const crypto = require('crypto');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SUPA_URL = () => process.env.SUPABASE_URL;
const SUPA_KEY = () => process.env.SUPABASE_KEY;
const base     = () => `${SUPA_URL()}/rest/v1`;

const sbHeaders = () => ({
  'apikey':        SUPA_KEY(),
  'Authorization': `Bearer ${SUPA_KEY()}`,
  'Content-Type':  'application/json',
});

// ── Carrega a config salva (cfg_campanhas + cfg_shopee) do mesmo lugar
// que o config.js grava — a tabela afilidash_config, chave 'user-config'.
async function carregarConfig() {
  const res = await fetch(`${base()}/afilidash_config?chave=eq.user-config&select=valor`, {
    headers: sbHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Falha ao carregar config: HTTP ${res.status} — ${txt.slice(0, 300)}`);
  }
  const rows = await res.json();
  return rows[0]?.valor || {};
}

// ── Resolve shopId + itemId a partir do link do anúncio ──────────────
// Segue redirecionamentos manualmente (shortlink s.shopee.com.br ou link já
// resolvido) e extrai do path final: /{slug}/{shopId}/{itemId}
async function resolverShopItem(link) {
  let url = link;
  for (let hop = 0; hop < 5; hop++) {
    let res;
    try {
      res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    } catch (e) {
      return null; // rede falhou / link inválido
    }
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      continue; // segue o próximo hop
    }
    break; // não é redirect — essa é a URL final
  }
  try {
    const path = new URL(url).pathname;
    const m = path.match(/^\/[^/]+\/(\d+)\/(\d+)/);
    return m ? { shopId: m[1], itemId: m[2] } : null;
  } catch (e) {
    return null;
  }
}

// ── Assina e chama a GraphQL da Shopee (mesmo esquema do shopee.js) ──
async function shopeeQuery(appId, secret, query) {
  const SHOPEE_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
  const timestamp  = Math.floor(Date.now() / 1000);
  const payload    = JSON.stringify({ query });
  const baseStr    = appId + timestamp + payload + secret;
  const signature  = crypto.createHash('sha256').update(baseStr).digest('hex');
  const auth       = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

  const res  = await fetch(SHOPEE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body:    payload,
  });
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data;
}

// ── Busca a comissão de UM produto (não a média da loja) ─────────────
// Produto indisponível/removido não dá erro — só volta nodes: [] vazio.
async function buscarComissaoProduto(appId, secret, shopId, itemId) {
  const query = `{ productOfferV2(shopId: ${shopId}, itemId: ${itemId}) { nodes { commissionRate } } }`;
  const data  = await shopeeQuery(appId, secret, query);
  const nodes = data?.data?.productOfferV2?.nodes || [];
  if (!nodes.length) return { indisponivel: true, comissao: 0 };
  const rate = parseFloat(nodes[0].commissionRate || 0);
  return { indisponivel: false, comissao: rate * 100 }; // vira percentual (ex: 0.10 -> 10)
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Apenas POST' }) };

  if (!SUPA_URL() || !SUPA_KEY())
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase não configurado' }) };

  try {
    const cfg          = await carregarConfig();
    const cfgCampanhas = cfg.cfg_campanhas || {};
    const cfgShopee    = cfg.cfg_shopee    || [];

    // Comissão de produto não depende de qual conta afiliada consulta —
    // usa a primeira conta Shopee ativa com App ID + Secret configurados.
    const contaApi = cfgShopee.find(c => c.ativo && c.tipo === 'api' && c.appId && c.secret);
    if (!contaApi)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhuma conta Shopee com App ID + Secret configurada' }) };

    // Só campanhas ATIVAS com link salvo — economiza chamada de API em campanha pausada.
    const alvos = Object.entries(cfgCampanhas)
      .filter(([sid, c]) => c && c.link && (c.effective_status || '').toUpperCase() === 'ACTIVE');

    if (!alvos.length)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, verificados: 0, mensagem: 'Nenhuma campanha ativa com link salvo' }) };

    // Agrupa por produto (shopId+itemId) — evita consultar o mesmo produto 2x
    // quando 2+ campanhas apontam pro mesmo link. Guarda o sub_id da campanha
    // mais recente processada (é só informativo, não afeta o valor da comissão).
    const porProduto = new Map();
    const semLink = [];
    for (const [sid, c] of alvos) {
      const par = await resolverShopItem(c.link);
      if (!par) { semLink.push(sid); continue; }
      porProduto.set(`${par.shopId}|${par.itemId}`, { ...par, sid });
    }

    let verificados = 0, alertasNovos = 0, indisponiveis = 0;
    const erros = [];

    for (const { shopId, itemId, sid } of porProduto.values()) {
      try {
        const { indisponivel, comissao } = await buscarComissaoProduto(contaApi.appId, contaApi.secret, shopId, itemId);
        const comissaoFinal = indisponivel ? 0 : comissao;

        // Leitura anterior desse produto, se existir
        const existRes  = await fetch(
          `${base()}/shopee_comissao_cache?shop_id=eq.${shopId}&item_id=eq.${itemId}&select=comissao_atual,alerta_ativo,confirmado`,
          { headers: sbHeaders() }
        );
        const existRows = existRes.ok ? await existRes.json() : [];
        const anterior   = existRows[0] || null;

        // Regra do alerta: uma queda real sempre reabre o alerta (mesmo que um alerta
        // anterior já tivesse sido confirmado). Sem queda nesse ciclo, não mexe no que
        // já estava salvo — o alerta só some quando alguém confirma manualmente.
        let alertaAtivo = anterior?.alerta_ativo || false;
        let confirmado  = anterior?.confirmado   || false;
        const houveQueda = anterior && comissaoFinal < Number(anterior.comissao_atual || 0);
        if (houveQueda) { alertaAtivo = true; confirmado = false; alertasNovos++; }
        // primeira leitura (anterior === null): só grava baseline, não dispara alerta

        const row = {
          shop_id:           shopId,
          item_id:           itemId,
          sub_id:            sid,
          comissao_atual:    comissaoFinal,
          comissao_anterior: anterior ? Number(anterior.comissao_atual || 0) : null,
          indisponivel,
          alerta_ativo:      alertaAtivo,
          confirmado,
          verificado_em:     new Date().toISOString(),
        };

        const upRes = await fetch(`${base()}/shopee_comissao_cache?on_conflict=shop_id,item_id`, {
          method:  'POST',
          headers: { ...sbHeaders(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body:    JSON.stringify([row]),
        });
        if (!upRes.ok) {
          const txt = await upRes.text().catch(() => String(upRes.status));
          erros.push(`${shopId}/${itemId}: ${txt}`);
          continue;
        }

        verificados++;
        if (indisponivel) indisponiveis++;
      } catch (e) {
        erros.push(`${shopId}/${itemId}: ${e.message}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok:                 erros.length === 0,
        verificados,
        alertas_novos:      alertasNovos,
        indisponiveis,
        sem_link_resolvido: semLink,
        erros,
      }),
    };

  } catch (err) {
    console.error('Comissão error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
