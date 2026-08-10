# Financial Dashboard — Implementation Guide

## Problem
The financial dashboard is missing data that exists in the complete HTML reference (`dashboard_completo_v2.html`). The current backend returns an incomplete schema, causing the frontend to fail when trying to render fields like `pessoa.juliane`, `dividas`, `despesas`, etc.

## Solution
Update the `server.js` file on the VPS to return a **complete DEFAULT_DATA structure** with deep merge logic instead of shallow merge.

---

## Current Setup
- **Backend:** `/home/benetti/MGD-Benetti/server.js` (Node.js Express)
- **Frontend:** `/home/benetti/MGD-Benetti/public/index.html` (Deployed at https://financeiro.descontoirresistivel.com.br)
- **API Endpoint:** `GET /api/dados` (Returns financial data)

---

## Changes Required on VPS

### 1. Update DEFAULT_DATA in server.js

Replace the existing DEFAULT_DATA object with the complete structure from `FINANCEIRO_DATA_SCHEMA.js`.

**Key additions:**
- `pessoa.juliane` — Complete person data for Juliane
- `pessoa.hugo` — Complete person data for Hugo  
- `contas` — Bank account balances
- `dividas` — All debt details (consignados, empréstimos, cartões)
- `despesas` — Fixed monthly expenses breakdown
- `receitas` — Monthly income breakdown
- `analise` — Financial analysis & projections

### 2. Implement Deep Merge Function

Replace the shallow merge in the GET endpoint with deep merge:

```javascript
// Add this function near the top of server.js
const mergeDeep = (target, source) => {
  const output = { ...target };
  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      output[key] = mergeDeep(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
};

// In the GET /api/dados route:
if (event.httpMethod === 'GET') {
  const r = await sb(`${base}/afilidash_config?chave=eq.user-config&select=valor`, SUPA_KEY);
  const rows = r.ok ? await r.json() : [];
  const dados = rows[0]?.valor || {};
  
  // Use deep merge instead of shallow merge
  const merged = mergeDeep(DEFAULT_DATA, dados);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(merged)
  };
}
```

### 3. Ensure POST Endpoint Preserves All Fields

The POST endpoint should not strip fields when saving:

```javascript
if (event.httpMethod === 'POST') {
  const body = JSON.parse(event.body || '{}');
  
  // Merge with defaults to preserve missing fields
  const merged = mergeDeep(DEFAULT_DATA, body);
  
  // Save merged data
  await sb(
    `${base}/afilidash_config?on_conflict=chave`,
    SUPA_KEY,
    'POST',
    [{ chave: 'user-config', valor: merged }]
  );
  
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
}
```

---

## How to Apply These Changes

### Option A: Manual Update via VPS Terminal

1. **SSH into VPS:**
   ```bash
   ssh user@descontoirresistivel.com.br
   cd /home/benetti/MGD-Benetti
   ```

2. **Backup current server.js:**
   ```bash
   cp server.js server.js.backup.$(date +%s)
   ```

3. **Update DEFAULT_DATA:**
   - Open `server.js` in editor: `nano server.js`
   - Replace the existing `DEFAULT_DATA` object with the complete version from `FINANCEIRO_DATA_SCHEMA.js`
   - Add the `mergeDeep()` function
   - Update GET and POST routes to use deep merge

4. **Restart server:**
   ```bash
   pm2 restart financeiro
   pm2 save
   ```

5. **Verify:**
   ```bash
   curl http://localhost:3001/api/dados | jq '.pessoa' | head -20
   ```
   Should show complete `juliane` and `hugo` objects.

### Option B: Copy-Paste Approach

The complete `DEFAULT_DATA` and implementation code is available in `FINANCEIRO_DATA_SCHEMA.js` in this repo.

---

## Testing Checklist

After updating the server:

- [ ] **GET /api/dados returns complete structure**
  ```bash
  curl http://localhost:3001/api/dados | jq '.pessoa.juliane'
  # Should show: { nome, empresa, cargo, salarioLiquido, ... }
  ```

- [ ] **Frontend receives all expected fields**
  - Open https://financeiro.descontoirresistivel.com.br
  - Open browser console (F12)
  - Check for TypeError messages about missing properties
  - Should be none

- [ ] **Dashboard renders all sections**
  - Resumo tab shows KPIs (Juliane salary, Hugo income, account balance, etc.)
  - Dívidas tab shows all debts
  - Despesas tab shows breakdown
  - Editor section allows saving changes

- [ ] **Save & reload works**
  - Make a change in the Editor
  - Save (should show success message)
  - Reload page
  - Change should persist

---

## Data Structure Overview

```
{
  pessoa: {
    juliane: { nome, empresa, cargo, salarioLiquido, ... },
    hugo: { nome, profissao, rendaBruta, rendaLiquida, ... }
  },
  contas: { saldo_total, ... },
  dividas: {
    total,
    consignados_folha,
    consignado_cc,
    emprestimo_cenira,
    cartao_black,
    bradesco_amazon,
    mercado_pago
  },
  despesas: {
    total_mensal,
    fixas: { escola_educacao, dividas, casa, outros, fatura_black_estimada }
  },
  receitas: { total_mensal, salario_juliane, hugo_taxi, outros_pix },
  analise: { deficit_mensal, projecoes, alivios_programados }
}
```

---

## Support

If you encounter issues:

1. **Check server logs:**
   ```bash
   pm2 logs financeiro
   ```

2. **Verify deep merge function works:**
   ```bash
   node -e "
   const mergeDeep = (t, s) => { const o = {...t}; for (const k in s) o[k] = s[k] instanceof Object && !Array.isArray(s[k]) ? mergeDeep(o[k]||{}, s[k]) : s[k]; return o; };
   console.log(mergeDeep({a: {b: 1}}, {a: {c: 2}}));
   "
   # Should output: { a: { b: 1, c: 2 } }
   ```

3. **Test API directly:**
   ```bash
   curl -X GET http://localhost:3001/api/dados
   ```

---

## Timeline

- **Immediate:** Update DEFAULT_DATA and deep merge function
- **Test:** Verify all fields return in API response  
- **Deploy:** Restart PM2 process
- **Validate:** Check frontend renders correctly

Expected time: ~15 minutes

---

## Files Referenced

- **FINANCEIRO_DATA_SCHEMA.js** — Complete data structure
- **dashboard_completo_v2.html** — Reference HTML with all expected fields
- **server.js** — Backend file to update (on VPS at `/home/benetti/MGD-Benetti/server.js`)
- **public/index.html** — Frontend (calls GET /api/dados)
