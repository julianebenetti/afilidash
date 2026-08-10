# 🚀 COMECE AQUI — Como Fazer Deploy

## Você tem 3 opções. Escolha UMA:

### ✅ OPÇÃO 1: Copiar e Colar (Mais fácil)
Abra: **`DEPLOY_MANUAL.md`**

Instruções super diretas:
- Copiar/colar comandos no terminal
- Instrições passo-a-passo para edições manuais
- Tudo pronto para você executar

---

### 🤖 OPÇÃO 2: Rodar um Script Automático (Mais rápido)
Use: **`deploy-financeiro-vps.sh`**

```bash
# 1. Copie os arquivos para o VPS
scp deploy-financeiro-vps.sh user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/
scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/
scp FINANCEIRO_DATA_SCHEMA.js user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/

# 2. Conecte ao VPS e rode
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti
bash deploy-financeiro-vps.sh
```

O script vai:
- ✅ Fazer backup automático
- ✅ Pedir para você confirmar que atualizou o frontend
- ✅ Pedir para você fazer as 3 alterações em server.js
- ✅ Reiniciar PM2 automaticamente
- ✅ Validar se tudo funcionou

---

### 📚 OPÇÃO 3: Entender Antes de Fazer
Leia: **`DEPLOYMENT_SUMMARY.md`**

Guia completo com:
- Explicação de cada fase
- Motivação de cada alteração
- Rollback detalhado
- Troubleshooting

---

## ⚡ Resumo Ultra-Rápido (para os preguiçosos 😄)

Se você só quer fazer e não quer saber de detalhes:

```bash
# 1. Clone o repo
git clone https://github.com/julianebenetti/afilidash.git
cd afilidash
git checkout claude/deploy-financeiro-vps-o6isl9

# 2. Copie tudo para o VPS
scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/index.html
scp FINANCEIRO_DATA_SCHEMA.js user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/

# 3. No VPS, faça as 3 alterações em server.js:
ssh user@descontoirresistivel.com.br
cd /home/benetti/MGD-Benetti
nano server.js

# 3a. Adicione mergeDeep() ANTES de const sb = ...
# 3b. Substitua DEFAULT_DATA pelo conteúdo de FINANCEIRO_DATA_SCHEMA.js
# 3c. Atualize o bloco if (event.httpMethod === 'GET')
#     (Veja exemplos em DEPLOY_MANUAL.md)

# 4. Reinicie
pm2 restart financeiro
pm2 save

# 5. Valide
curl http://localhost:3001/api/dados | jq '.dividas.total'
# Esperado: 109838
```

---

## 📍 Qual arquivo escolher?

| Você é | Então abra |
|--------|-----------|
| Preguiçoso / Quer fazer logo | **`DEPLOY_MANUAL.md`** (copiar/colar) |
| Gosta de automatizar / Tech savvy | **`deploy-financeiro-vps.sh`** (script) |
| Quer entender tudo | **`DEPLOYMENT_SUMMARY.md`** (explicação completa) |
| Quer referência técnica | **`FINANCEIRO_IMPLEMENTATION_GUIDE.md`** |

---

## ✅ Quando avisar que terminou

**Depois que você rodar os comandos no VPS, avise que terminou a Fase 4 (restart & verify), e eu**:

1. Abro https://financeiro.descontoirresistivel.com.br no navegador
2. Verifica F12 Console (sem erros)
3. Valida visualmente que todas as seções aparecem
4. Confirma que os valores estão corretos

Aí o deploy está **100% completo** ✅

---

## 📁 Arquivos neste Deploy

```
afilidash/
├── INICIO_DEPLOY.md (você está aqui)
├── DEPLOY_MANUAL.md (passo-a-passo copiar/colar)
├── deploy-financeiro-vps.sh (script automático)
├── DEPLOYMENT_SUMMARY.md (guia completo)
├── CHECKLIST.md (verificação)
├── FINANCEIRO_IMPLEMENTATION_GUIDE.md (referência técnica)
├── financeiro_dashboard_completo.html (novo frontend)
├── FINANCEIRO_DATA_SCHEMA.js (novo data backend)
└── README_FINANCEIRO.md (overview)
```

---

**Pronto? Escolha uma opção acima e comece! 🎯**
