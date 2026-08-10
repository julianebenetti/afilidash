# Financial Dashboard — Implementation Checklist

## Pre-Implementation
- [ ] Read `FINANCEIRO_ACTION_PLAN.md` for overview
- [ ] Have SSH access to Hostinger VPS ready
- [ ] Browser open to test at https://financeiro.descontoirresistivel.com.br
- [ ] DevTools (F12) open to monitor console for errors

---

## Step-by-Step Implementation

### Phase 1: Preparation (5 minutes)

- [ ] SSH into VPS
  ```bash
  ssh user@descontoirresistivel.com.br
  ```
  
- [ ] Navigate to project directory
  ```bash
  cd /home/benetti/MGD-Benetti
  ```
  
- [ ] Create backup of server.js
  ```bash
  cp server.js server.js.backup.$(date +%s)
  ```

---

### Phase 2: Add Deep Merge Function (3 minutes)

- [ ] Open `server.js` in editor
  ```bash
  nano server.js
  ```

- [ ] Find the line: `const sb = (url, token, method = 'GET', body = null) => {`

- [ ] Add this function BEFORE it:
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
  ```

- [ ] Save and close editor (Ctrl+O, Enter, Ctrl+X in nano)

---

### Phase 3: Update GET Endpoint (2 minutes)

- [ ] Reopen `server.js`
  ```bash
  nano server.js
  ```

- [ ] Find the section: `// ── GET — carrega configurações`

- [ ] Replace that entire if-block with:
  ```javascript
  if (event.httpMethod === 'GET') {
    const r = await sb(`${base}/afilidash_config?chave=eq.user-config&select=valor`, SUPA_KEY);
    const rows = r.ok ? await r.json() : [];
    const dados = rows[0]?.valor || {};
    const merged = mergeDeep(DEFAULT_DATA, dados);
    return { statusCode: 200, headers, body: JSON.stringify(merged) };
  }
  ```

- [ ] Save and close editor

---

### Phase 4: Replace DEFAULT_DATA (3 minutes)

- [ ] Reopen `server.js`
  ```bash
  nano server.js
  ```

- [ ] Find the line: `const DEFAULT_DATA = {`

- [ ] Delete the old DEFAULT_DATA object entirely

- [ ] Copy the COMPLETE DEFAULT_DATA from `FINANCEIRO_DATA_SCHEMA.js` in the GitHub repo

- [ ] Paste it in place of the old one

- [ ] Save and close editor

---

### Phase 5: Restart & Verify (2 minutes)

- [ ] Restart PM2 process
  ```bash
  pm2 restart financeiro
  pm2 save
  ```

- [ ] Check status
  ```bash
  pm2 status
  ```
  Should show: `online` for financeiro process

- [ ] Test API endpoint
  ```bash
  curl http://localhost:3001/api/dados | jq '.pessoa.juliane'
  ```
  Should output Juliane's complete data object

- [ ] Check server logs for errors
  ```bash
  pm2 logs financeiro --lines 20
  ```
  Should show: `Server running on port 3001` or similar (no errors)

---

## Testing (5 minutes)

### Browser Testing

- [ ] Hard refresh dashboard (Ctrl+Shift+R or Cmd+Shift+R)
  URL: https://financeiro.descontoirresistivel.com.br

- [ ] Open DevTools Console (F12)

- [ ] Verify NO errors about missing properties:
  - [ ] NO "Cannot read properties of undefined" errors
  - [ ] NO TypeError messages

- [ ] Check dashboard renders:
  - [ ] **Resumo Tab:** All KPI cards visible
    - [ ] Salário líquido Juliane (R$3.105)
    - [ ] Hugo líquido (R$2.350)
    - [ ] Saldo conta (R$5.587)
    - [ ] Dívida pessoal total (R$109.838)
    - [ ] Fatura Black (R$5.692)

  - [ ] **Dívidas Tab:** Shows all debts
    - [ ] Consignados folha (R$52.084)
    - [ ] Consignado C/C (R$28.743)
    - [ ] Empréstimo Cenira (R$23.252)
    - [ ] Mastercard Black (R$5.692)
    - [ ] Bradesco Amazon (R$67)

  - [ ] **Despesas Tab:** Shows expense breakdown
    - [ ] Escola/educação (R$2.275)
    - [ ] Dívidas (R$2.049)
    - [ ] Casa (R$1.238)
    - [ ] Outros (R$660)

  - [ ] **Other Sections:** All tabs render without errors

### Data Testing

- [ ] Click "Editor" tab (if available)

- [ ] Make a small test change (e.g., edit saldo or a value)

- [ ] Click Save

- [ ] Check success message appears (no error)

- [ ] Reload page (F5)

- [ ] Verify change persisted

---

## Rollback (if needed)

If something breaks:

- [ ] Identify the backup file timestamp
  ```bash
  ls -lah server.js.backup.*
  ```

- [ ] Restore it
  ```bash
  cp server.js.backup.<timestamp> server.js
  ```

- [ ] Restart server
  ```bash
  pm2 restart financeiro
  ```

- [ ] Test again

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Server won't start | Check logs: `pm2 logs financeiro` |
| 404 error on /api/dados | Verify server running: `pm2 status` |
| Still missing data fields | Verify DEFAULT_DATA was fully copied |
| Changes not persisting | Check Supabase connection credentials |
| Dashboard shows error | Clear browser cache (Ctrl+Shift+Delete) & reload |

---

## Success Criteria

After completing all steps, you should have:

- ✅ No console errors in browser DevTools
- ✅ Dashboard displays all KPI cards with correct values
- ✅ All sections (Dívidas, Despesas, etc.) render correctly
- ✅ Can save and reload data without loss
- ✅ API returns complete JSON structure with all fields

---

## Time Estimate

- **Total implementation:** ~15 minutes
- **Testing:** ~5 minutes
- **Buffer for questions:** ~10 minutes
- **Total:** ~30 minutes max

---

## Support Resources

If you get stuck:

1. **Read first:** `FINANCEIRO_IMPLEMENTATION_GUIDE.md` (detailed technical guide)
2. **Quick reference:** `FINANCEIRO_ACTION_PLAN.md` (step-by-step overview)
3. **Data structure:** `FINANCEIRO_DATA_SCHEMA.js` (complete data model)
4. **Reference HTML:** `dashboard_completo_v2.html` (what dashboard should look like)

---

## Questions to Ask Before Rollback

- Does server log show any errors?
- Did you copy the ENTIRE DEFAULT_DATA object?
- Is the `mergeDeep` function syntactically correct?
- Did PM2 restart successfully?

If you can answer these, usually the issue is minor and fixable without rollback.

---

**Last updated:** 2026-08-10  
**Branch:** `claude/deploy-financeiro-vps-o6isl9`  
**Status:** Ready to implement ✅
