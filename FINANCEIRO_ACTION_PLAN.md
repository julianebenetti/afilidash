# Financial Dashboard — Quick Action Plan

## Current Issue
Dashboard is missing data that exists in the reference HTML. Frontend throws errors like:
```
TypeError: Cannot read properties of undefined (reading 'juliane')
```

**Root Cause:** Backend returns incomplete data schema. Frontend expects full structure with `pessoa`, `dividas`, `despesas`, etc., but backend only returns `receitas`, `despesas`, `investimentos`, `lastUpdated`.

---

## Solution Summary

Update **`/home/benetti/MGD-Benetti/server.js`** on the VPS to:

1. **Replace DEFAULT_DATA** with the complete structure (see `FINANCEIRO_DATA_SCHEMA.js`)
2. **Implement deep merge** instead of shallow merge in GET/POST endpoints
3. **Restart the server** with PM2

**Estimated time:** 15 minutes  
**Impact:** ✅ All dashboard sections will render correctly

---

## Quick Implementation Steps

### Step 1: Connect to VPS
```bash
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti
```

### Step 2: Backup & Edit
```bash
cp server.js server.js.backup.$(date +%s)
nano server.js  # or your preferred editor
```

### Step 3: Add Deep Merge Function
Find this section and replace it:

**BEFORE:**
```javascript
const sb = (url, token, method = 'GET', body = null) => {
  // ... function code ...
};
```

**AFTER (insert before `sb` function):**
```javascript
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

const sb = (url, token, method = 'GET', body = null) => {
  // ... function code ...
};
```

### Step 4: Update GET /api/dados Endpoint
Replace the entire GET route with this:

```javascript
// ── GET — carrega configurações
if (event.httpMethod === 'GET') {
  const r = await sb(`${base}/afilidash_config?chave=eq.user-config&select=valor`, SUPA_KEY);
  const rows = r.ok ? await r.json() : [];
  const dados = rows[0]?.valor || {};
  
  // Use deep merge to ensure all DEFAULT_DATA fields are present
  const merged = mergeDeep(DEFAULT_DATA, dados);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(merged)
  };
}
```

### Step 5: Update DEFAULT_DATA
Replace the existing `DEFAULT_DATA` object with the complete version from `FINANCEIRO_DATA_SCHEMA.js`.

This includes:
- `pessoa.juliane` — Juliane's financial info
- `pessoa.hugo` — Hugo's financial info
- `contas` — Account balances
- `dividas` — All debts with details
- `despesas` — Fixed monthly expenses
- `receitas` — Monthly income
- `analise` — Financial analysis & projections

### Step 6: Restart Server
```bash
pm2 restart financeiro
pm2 save
```

### Step 7: Verify
```bash
# Check server is running
pm2 status

# Test API returns complete data
curl http://localhost:3001/api/dados | jq '.pessoa.juliane'

# Should output something like:
# {
#   "nome": "Juliane Benetti",
#   "empresa": "Elektro Redes S.A.",
#   "cargo": "Analista",
#   ...
# }
```

---

## Verify Frontend Works

After server restart:

1. Open https://financeiro.descontoirresistivel.com.br in browser
2. Open DevTools (F12) → Console
3. **Should see NO errors** about missing properties
4. **Dashboard should display:**
   - All KPI cards (salaries, balance, debts, etc.)
   - Complete dívidas section
   - Complete despesas breakdown
   - All analysis sections

---

## Rollback (if needed)

If something breaks:

```bash
# Restore from backup
cp server.js.backup.<timestamp> server.js
pm2 restart financeiro
```

---

## Files Available in This Branch

- **`FINANCEIRO_DATA_SCHEMA.js`** — Complete DEFAULT_DATA structure (copy this for server.js)
- **`FINANCEIRO_IMPLEMENTATION_GUIDE.md`** — Detailed technical guide
- **`dashboard_completo_v2.html`** — Reference HTML showing all expected fields

---

## Key Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| DEFAULT_DATA fields | ~10 fields | ~50+ fields |
| Merge strategy | Shallow (loses nested data) | Deep (preserves all nested structures) |
| Frontend errors | ✗ TypeError on missing properties | ✓ All properties available |
| Dashboard completeness | ~30% data | 100% data |

---

## Questions?

Check `FINANCEIRO_IMPLEMENTATION_GUIDE.md` for:
- Detailed troubleshooting
- Data structure overview
- Testing checklist
- Support tips
