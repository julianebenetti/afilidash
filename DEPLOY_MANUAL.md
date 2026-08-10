# Guia Prático de Deploy — Copiar e Colar

## ⚠️ PRÉ-REQUISITOS
- Você tem acesso SSH ao VPS: `ssh user@descontoirresistivel.com.br`
- Os arquivos abaixo estão no repositório `afilidash` na branch `claude/deploy-financeiro-vps-o6isl9`:
  - `financeiro_dashboard_completo.html` (novo frontend)
  - `FINANCEIRO_DATA_SCHEMA.js` (novo DEFAULT_DATA)

---

## OPÇÃO 1: Script Automático (Recomendado)

### Passo 1: Preparar o script no seu computador

```bash
# No seu computador local, clone o repositório se não tiver
git clone https://github.com/julianebenetti/afilidash.git
cd afilidash
git checkout claude/deploy-financeiro-vps-o6isl9

# Copie o script para o VPS
scp deploy-financeiro-vps.sh user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/

# Copie os arquivos necessários para o VPS
scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/
scp FINANCEIRO_DATA_SCHEMA.js user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/
```

### Passo 2: Conectar ao VPS e rodar o script

```bash
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti
bash deploy-financeiro-vps.sh
```

O script vai parar em 2 pontos para você confirmar que fez as alterações manualmente:
1. Após copiar o HTML para index.html
2. Após fazer as 3 alterações em server.js

---

## OPÇÃO 2: Manual Passo-a-Passo (Se preferir fazer tudo manualmente)

### Passo 1: Backup

```bash
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti

# Criar backups com timestamp
cp server.js server.js.backup.$(date +%s)
cp public/index.html public/index.html.backup.$(date +%s)

# Verificar que os backups foram criados
ls -lh server.js.backup.* public/index.html.backup.*
```

### Passo 2: Atualizar Frontend

**No seu computador local**, copie o novo HTML:

```bash
scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/index.html
```

**Ou**, se preferir editar manualmente no VPS:

```bash
# No VPS
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti/public

# Abrir editor (ou fazer backup e copiar conteúdo)
nano index.html

# Apagar tudo (Ctrl+K em nano) ou selecionar tudo
# Colar o conteúdo COMPLETO de financeiro_dashboard_completo.html
# Salvar (Ctrl+O, Enter, Ctrl+X em nano)
```

### Passo 3: Atualizar Backend — Part A (Adicionar mergeDeep)

```bash
# No VPS
nano server.js
```

Encontre a linha: `const sb = (url, token, method = 'GET', body = null) => {`

**ADICIONE ANTES DELA** (cole exatamente isso):

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

Salve e saia (Ctrl+O, Enter, Ctrl+X).

### Passo 3B: Atualizar Backend — Part B (Substituir DEFAULT_DATA)

```bash
nano server.js
```

Encontre: `const DEFAULT_DATA = {`

**EXCLUA TODO o objeto DEFAULT_DATA** (do primeiro `{` até o último `};`)

**COLE O CONTEÚDO COMPLETO** de `FINANCEIRO_DATA_SCHEMA.js`

Dica: No seu computador, copie o arquivo inteiro de FINANCEIRO_DATA_SCHEMA.js (menos o comentário inicial), e cole.

Salve (Ctrl+O, Enter, Ctrl+X).

### Passo 3C: Atualizar Backend — Part C (GET endpoint)

```bash
nano server.js
```

Encontre: `// ── GET — carrega configurações`

Procure por: `if (event.httpMethod === 'GET') {`

**SUBSTITUA TODO esse bloco if por:**

```javascript
if (event.httpMethod === 'GET') {
  const r = await sb(`${base}/afilidash_config?chave=eq.user-config&select=valor`, SUPA_KEY);
  const rows = r.ok ? await r.json() : [];
  const dados = rows[0]?.valor || {};
  const merged = mergeDeep(DEFAULT_DATA, dados);
  return { statusCode: 200, headers, body: JSON.stringify(merged) };
}
```

Salve (Ctrl+O, Enter, Ctrl+X).

### Passo 4: Restart & Verify

```bash
# No VPS
pm2 restart financeiro
pm2 save

# Aguarde 2 segundos
sleep 2

# Verificar status
pm2 status

# Testar API
curl http://localhost:3001/api/dados | jq '.pessoa.juliane.nome'
# Esperado: "Juliane Benetti"

curl http://localhost:3001/api/dados | jq '.dividas.total'
# Esperado: 109838

# Ver logs
pm2 logs financeiro --lines 20
```

---

## OPÇÃO 3: Copiar Tudo de Uma Vez (Mais Rápido)

Se tiver todos os arquivos no seu computador local, faça:

```bash
# Do seu computador
cd afilidash
git checkout claude/deploy-financeiro-vps-o6isl9

# Copiar TUDO para o VPS
scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/index.html
scp FINANCEIRO_DATA_SCHEMA.js user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/

# Conectar ao VPS
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti

# Backup
cp server.js server.js.backup.$(date +%s)
cp public/index.html public/index.html.backup.$(date +%s)

# Editar server.js com as 3 alterações (usando nano)
nano server.js
```

Então faça as 3 alterações manualmente em server.js (veja Passo 3A, 3B, 3C acima).

---

## ✅ Verificação Final

Após tudo pronto, teste:

```bash
# No VPS
pm2 status  # Deve estar 'online'
curl http://localhost:3001/api/dados | jq '.pessoa.juliane.nome'  # Deve retornar "Juliane Benetti"
curl http://localhost:3001/api/dados | jq '.dividas.total'  # Deve retornar 109838
```

Depois abra no navegador:
- **URL:** https://financeiro.descontoirresistivel.com.br
- **F12 → Console:** Não deve haver erros
- **Validar visualmente:** Todas as abas devem aparecer

---

## 🔄 Rollback (Se algo quebrar)

```bash
# No VPS
# Listar backups
ls -lh server.js.backup.* public/index.html.backup.*

# Restaurar (substitua TIMESTAMP pelos números reais)
cp server.js.backup.TIMESTAMP server.js
cp public/index.html.backup.TIMESTAMP public/index.html

# Reiniciar
pm2 restart financeiro
pm2 save

# Verificar
pm2 status
```

---

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| Server não inicia | Verificar sintaxe de JavaScript: `pm2 logs financeiro` |
| Still missing data | Verificar se DEFAULT_DATA foi copiado completamente |
| API retorna 404 | Fazer `pm2 restart financeiro` novamente |
| Dashboard carrega em branco | Hard refresh no navegador (Ctrl+Shift+R) e limpar cache |
| Erros no console | Verificar se merge Deep foi adicionado corretamente |

---

## 📋 Checklist Final

- [ ] Backup criado (server.js.backup.*, public/index.html.backup.*)
- [ ] public/index.html atualizado com novo HTML
- [ ] mergeDeep() adicionado a server.js
- [ ] DEFAULT_DATA substituído em server.js
- [ ] GET endpoint atualizado com deep merge
- [ ] pm2 restart financeiro executado
- [ ] pm2 status mostra 'online'
- [ ] curl retorna "Juliane Benetti" e 109838
- [ ] Dashboard abre no navegador sem erros
- [ ] Todas as abas aparecem (Diagnóstico, Fluxo de caixa, Cenários)

---

**Quando tudo estiver pronto, avise que você completou o deploy no VPS, e eu faço a verificação visual final no navegador!** ✅
