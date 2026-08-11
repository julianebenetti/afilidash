# 🚀 DEPLOYMENT FINANCEIRO DASHBOARD NA VPS

## Status: ✅ PRONTO PARA DEPLOY

**Commit:** `6f3d9cb` - Dashboard financeiro completo com 5 abas  
**Branch:** `claude/deploy-financeiro-vps-o6isl9`  
**URL Esperada:** `https://financeiro.descontoirresistivel.com.br`

---

## 📦 Estrutura dos Arquivos

```
/home/afilidash/
├── server.js                          # Express.js API server (porta 3001)
├── public/index.html                  # Dashboard com 5 abas (NOVO - MERGED)
├── data/financeiro.json               # Dados financeiros persistentes
├── data/apontamentos.json             # Sistema de apontamentos/notas
├── package.json                       # Dependências (express)
├── ecosystem.config.js                # Configuração PM2
└── logs/                              # Logs da aplicação (criados automaticamente)
```

---

## 🎯 O QUE FOI ENTREGUE

### 5 ABAS COMPLETAS:

#### 📊 **RESUMO**
- KPIs: Salário, Renda Hugo, Total Mensal, Saldo, Dívida, Déficit
- Gráfico Black Card Evolution (6 meses reais + 2 meses projetados)
- Timeline de Alívios Automáticos (jun/26 → jan/27)
- Regra de Ouro: Não criar novos parcelamentos

#### 🏦 **DÍVIDAS**  
- Consignados (folha): R$52.084 (R$1.564/mês)
- Consignado C/C: R$28.743 (R$1.403/mês) — 32/60 parcelas
- Empréstimo Cenira: R$23.252 (R$646/mês) — 36 parcelas
- Mastercard Black: R$5.692 ✅ (quitada, caindo há 3 meses)
- Bradesco Amazon: R$67 ✅ (praticamente zerado)
- Mercado Pago: 6x R$1.943 (até nov/26)

#### 💸 **DESPESAS**
- Progress Bars: Distribuição visual de R$10.974
- Categorização Estratégica:
  - ✅ Necessidades (manter): R$5.518
  - ⚠️ Avaliar (reduzir): R$1.208
  - 🔴 Parar (eliminar): ~R$166
- Detalhes por categoria: Escola, Dívidas, Casa, Outros, Black Card

#### 📈 **FLUXO**
- Entradas: R$5.750 (Juliane + Hugo - Combustível)
- Saídas: R$10.974 (todas as categorias)
- Ciclo Visual: R$5.750 → R$10.974 → R$5.224 DÉFICIT
- Alertas: Mercado Pago até nov, Black cai automaticamente
- Scenario Cards:
  - Fev/2027: Déficit melhora para -R$2.232
  - Dez/2026: 13º+PLR libera R$1.403/mês (consignado C/C)

#### ⚙️ **EDITOR**
- JSON editor interativo
- Export/Import de dados
- Sync bidirecionado com servidor

---

## 🔧 INSTALAÇÃO NA VPS

### PASSO 1: Conectar SSH
```bash
ssh root@seu-ip-vps
```

### PASSO 2: Clonar repositório (se não existe)
```bash
cd /home
git clone https://github.com/julianebenetti/afilidash.git
cd afilidash
git checkout claude/deploy-financeiro-vps-o6isl9
```

### PASSO 3: Atualizar repositório (se já existe)
```bash
cd /home/afilidash
git fetch origin
git checkout claude/deploy-financeiro-vps-o6isl9
git pull origin claude/deploy-financeiro-vps-o6isl9
```

### PASSO 4: Instalar dependências
```bash
npm install
```

### PASSO 5: Criar diretórios de logs
```bash
mkdir -p logs
chmod 755 logs
```

### PASSO 6: Instalar PM2 (primeira vez)
```bash
sudo npm install -g pm2
```

### PASSO 7: Iniciar aplicação com PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### PASSO 8: Configurar Nginx (reverse proxy)

Criar arquivo de config:
```bash
sudo nano /etc/nginx/sites-available/financeiro.descontoirresistivel.com.br
```

Colar conteúdo:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name financeiro.descontoirresistivel.com.br;

    # Redirect HTTP to HTTPS (opcional, se tiver SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/financeiro.descontoirresistivel.com.br \
           /etc/nginx/sites-enabled/

# Verificar sintaxe
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

```bash
# 1. Verificar status PM2
pm2 status
pm2 logs financeiro-dashboard

# 2. Verificar resposta HTTP
curl -i http://localhost:3001

# 3. Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# 4. Testar acesso
curl https://financeiro.descontoirresistivel.com.br
```

---

## 📊 ENDPOINTS DISPONÍVEIS

```
GET  /                              # Dashboard HTML
GET  /api/dados                     # Dados financeiros JSON
POST /api/dados                     # Salvar dados atualizados
GET  /api/apontamentos              # Lista de apontamentos
POST /api/apontamentos              # Criar apontamento
POST /api/apontamentos/:id/confirmar # Confirmar apontamento
DELETE /api/apontamentos/:id        # Deletar apontamento
GET  /api/health                    # Health check
```

---

## 🔄 ATUALIZAR DADOS

### Via Dashboard (Recomendado)
1. Acesse https://financeiro.descontoirresistivel.com.br
2. Clique em ⚙️ Editor
3. Edite os valores JSON
4. Clique em 💾 Salvar Alterações

### Via SSH
```bash
ssh root@seu-ip-vps
nano /home/afilidash/data/financeiro.json
# Editar e salvar (Ctrl+O, Enter, Ctrl+X)
pm2 restart financeiro-dashboard  # Não necessário, mas recomendado
```

---

## 🆘 TROUBLESHOOTING

### Erro: Connection refused (porta 3001)
```bash
# Verificar se server está rodando
ps aux | grep node

# Se não está rodando:
cd /home/afilidash
pm2 start ecosystem.config.js --env production
```

### Erro: 502 Bad Gateway (Nginx)
```bash
# 1. Verificar logs Nginx
sudo tail -f /var/log/nginx/error.log

# 2. Verificar se Node está respondendo
curl http://localhost:3001

# 3. Verificar PM2
pm2 logs financeiro-dashboard
```

### Erro: HTTP 404
```bash
# Verificar se arquivo existe
ls -la /home/afilidash/public/index.html

# Verificar permissões
chmod 644 /home/afilidash/public/index.html
```

### Erro: Permission denied
```bash
# Dar permissões ao usuário
sudo chown -R root:root /home/afilidash
sudo chmod -R 755 /home/afilidash
```

---

## 📈 MONITORAMENTO

```bash
# Monitor em tempo real
pm2 monit

# Ver logs últimas 100 linhas
pm2 logs financeiro-dashboard --lines 100

# Limpar logs
pm2 flush

# Reiniciar aplicação
pm2 restart financeiro-dashboard

# Parar
pm2 stop financeiro-dashboard

# Listar todas as apps
pm2 list
```

---

## 🔐 SEGURANÇA (Opcional)

### SSL/HTTPS com Certbot (Let's Encrypt)
```bash
# Instalar
sudo apt-get install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot certonly --nginx -d financeiro.descontoirresistivel.com.br

# Atualizar Nginx com SSL
sudo nano /etc/nginx/sites-available/financeiro.descontoirresistivel.com.br
```

Adicionar após primeira linha:
```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;

ssl_certificate /etc/letsencrypt/live/financeiro.descontoirresistivel.com.br/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/financeiro.descontoirresistivel.com.br/privkey.pem;

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name financeiro.descontoirresistivel.com.br;
    return 301 https://$server_name$request_uri;
}
```

Renovação automática:
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 📋 CHECKLIST FINAL

- [ ] Git branch correto (`claude/deploy-financeiro-vps-o6isl9`)
- [ ] Repositório clonado/atualizado na VPS
- [ ] `npm install` executado
- [ ] `pm2 start ecosystem.config.js --env production` rodando
- [ ] `pm2 save` e `pm2 startup` configurados
- [ ] Nginx configurado e testado
- [ ] Acesso a https://financeiro.descontoirresistivel.com.br funcionando
- [ ] Todas as 5 abas carregando e respondendo
- [ ] Dados do JSON carregando corretamente
- [ ] Editor JSON respondendo
- [ ] PM2 logs monitorados

---

## 📞 SUPORTE

**Erro encontrado?**
```bash
# Coletar informações de debug
pm2 logs financeiro-dashboard --lines 50
sudo tail -f /var/log/nginx/error.log
curl -v https://financeiro.descontoirresistivel.com.br
```

**Versão:** 2.0 (Dashboard com análise completa)  
**Data:** 2026-08-11  
**Status:** ✅ PRODUÇÃO PRONTO
