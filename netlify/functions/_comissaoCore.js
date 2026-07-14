// netlify/functions/_comissaoCore.js — AffiliDash v3
// Lógica compartilhada entre comissao.js (disparo manual, botão "Atualizar Meta
// Ads") e comissao-scheduled.js (roda sozinho, 4x/dia). Não é uma function HTTP
// própria — é só um módulo importado pelas outras duas.

const crypto = require('crypto');

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
// resolvido) e extrai do path final, testando os 2 formatos que a Shopee usa:
// deep link (/{slug}/{shopId}/{itemId}) e clássico (...-i.{shopId}.{itemId})
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
    const m1 = path.match(/^\/[^/]+\/(\d+)\/(\d+)/);      // deep link
    if (m1) return { shopId: m1[1], itemId: m1[2] };
    const m2 = path.match(/-i\.(\d+)\.(\d+)/);              // clássico
    if (m2) return { shopId: m2[1], itemId: m2[2] };
    return null;
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

// ── Busca dados extras do produto pro corpo do e-mail de alerta ──────
// Campos além de commissionRate não são garantidos pela API — se a query
// falhar (campo inexistente), volta null e quem chamou usa "N/D" em vez de
// travar o alerta inteiro por causa de um campo cosmético.
async function buscarDetalhesProduto(appId, secret, shopId, itemId) {
  const query = `{ productOfferV2(shopId: ${shopId}, itemId: ${itemId}) { nodes {
    productName commissionRate sellerCommissionRate shopeeCommissionRate
    price priceMin priceMax shopName imageUrl productLink offerLink
  } } }`;
  try {
    const data = await shopeeQuery(appId, secret, query);
    return data?.data?.productOfferV2?.nodes?.[0] || null;
  } catch (e) {
    return null; // degradação segura — ver comentário acima
  }
}

// ── Roda o ciclo completo: campanhas ativas -> produtos -> comissão -> cache ──
// Retorna um resumo + a lista de produtos que abriram um alerta NOVO nesse
// ciclo (pra quem chamou decidir se manda e-mail, toast, etc.)
async function verificarComissoes() {
  if (!SUPA_URL() || !SUPA_KEY())
    return { ok: false, error: 'Supabase não configurado' };

  const cfg          = await carregarConfig();
  const cfgCampanhas = cfg.cfg_campanhas || {};
  const cfgShopee    = cfg.cfg_shopee    || [];

  const contaApi = cfgShopee.find(c => c.ativo && c.tipo === 'api' && c.appId && c.secret);
  if (!contaApi)
    return { ok: false, error: 'Nenhuma conta Shopee com App ID + Secret configurada' };

  const alvos = Object.entries(cfgCampanhas)
    .filter(([sid, c]) => c && c.link && (c.effective_status || '').toUpperCase() === 'ACTIVE');

  if (!alvos.length)
    return { ok: true, verificados: 0, alertas_novos: 0, indisponiveis: 0, sem_link_resolvido: [], erros: [], alertasDetalhados: [] };

  const porProduto = new Map();
  const semLink = [];
  for (const [sid, c] of alvos) {
    const par = await resolverShopItem(c.link);
    if (!par) { semLink.push(sid); continue; }
    const chave = `${par.shopId}|${par.itemId}`;
    const existente = porProduto.get(chave);
    if (existente) existente.sids.push(sid);
    else porProduto.set(chave, { ...par, sids: [sid] });
  }

  let verificados = 0, alertasNovos = 0, indisponiveis = 0;
  const erros = [];
  const alertasDetalhados = [];

  for (const { shopId, itemId, sids } of porProduto.values()) {
    try {
      const { indisponivel, comissao } = await buscarComissaoProduto(contaApi.appId, contaApi.secret, shopId, itemId);
      const comissaoFinal = indisponivel ? 0 : comissao;

      const existRes  = await fetch(
        `${base()}/shopee_comissao_cache?shop_id=eq.${shopId}&item_id=eq.${itemId}&select=comissao_atual,alerta_ativo,confirmado`,
        { headers: sbHeaders() }
      );
      const existRows = existRes.ok ? await existRes.json() : [];
      const anterior   = existRows[0] || null;

      let alertaAtivo = anterior?.alerta_ativo || false;
      let confirmado  = anterior?.confirmado   || false;
      const comissaoAnteriorNum = anterior ? Number(anterior.comissao_atual || 0) : null;
      const houveQueda = anterior && comissaoFinal < comissaoAnteriorNum;
      if (houveQueda) {
        alertaAtivo = true; confirmado = false; alertasNovos++;
        alertasDetalhados.push({ shopId, itemId, sids, contaApi, comissaoAnterior: comissaoAnteriorNum, comissaoAtual: comissaoFinal });
      }
      // primeira leitura (anterior === null): só grava baseline, não dispara alerta

      const row = {
        shop_id:           shopId,
        item_id:           itemId,
        sub_ids:           sids,
        comissao_atual:    comissaoFinal,
        comissao_anterior: comissaoAnteriorNum,
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
    ok:                 erros.length === 0,
    verificados,
    alertas_novos:      alertasNovos,
    indisponiveis,
    sem_link_resolvido: semLink,
    erros,
    alertasDetalhados, // usado só pelo comissao-scheduled.js pra decidir o que emailar
  };
}

module.exports = {
  SUPA_URL, SUPA_KEY, base, sbHeaders,
  carregarConfig, resolverShopItem, shopeeQuery,
  buscarComissaoProduto, buscarDetalhesProduto,
  verificarComissoes,
};
