#!/bin/bash
# ════════════════════════════════════════════════════════════════
# SCRIPT DE DEPLOY AUTOMÁTICO — Dashboard Financeiro
# ════════════════════════════════════════════════════════════════
#
# USO: bash deploy-financeiro-vps.sh
#
# Este script executa todas as 4 fases de deploy automaticamente:
# 1. Backup dos arquivos originais
# 2. Atualização do frontend (index.html)
# 3. Atualização do backend (server.js)
# 4. Restart e verificação
#

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "INICIANDO DEPLOY DO DASHBOARD FINANCEIRO"
echo "════════════════════════════════════════════════════════════════"

# Verificar se estamos no diretório correto
if [ ! -f "server.js" ]; then
    echo "❌ ERRO: server.js não encontrado"
    echo "Certifique-se de estar em /home/benetti/MGD-Benetti"
    exit 1
fi

# ════════════════════════════════════════════════════════════════
# FASE 1: BACKUP
# ════════════════════════════════════════════════════════════════
echo ""
echo "📦 FASE 1: Fazendo backup dos arquivos originais..."
BACKUP_TIMESTAMP=$(date +%s)
cp server.js "server.js.backup.${BACKUP_TIMESTAMP}"
cp public/index.html "public/index.html.backup.${BACKUP_TIMESTAMP}"
echo "✅ Backup criado: server.js.backup.${BACKUP_TIMESTAMP}"
echo "✅ Backup criado: public/index.html.backup.${BACKUP_TIMESTAMP}"

# ════════════════════════════════════════════════════════════════
# FASE 2: ATUALIZAR FRONTEND
# ════════════════════════════════════════════════════════════════
echo ""
echo "🎨 FASE 2: Atualizando frontend (public/index.html)..."
echo "⚠️  Você precisa fazer isso manualmente via scp ou copiar o conteúdo de financeiro_dashboard_completo.html"
echo ""
echo "Opção A (scp do seu computador local):"
echo "  scp financeiro_dashboard_completo.html user@descontoirresistivel.com.br:/home/benetti/MGD-Benetti/public/"
echo "  ssh user@descontoirresistivel.com.br 'cd /home/benetti/MGD-Benetti/public && mv financeiro_dashboard_completo.html index.html'"
echo ""
echo "Opção B (copiar manualmente com nano):"
echo "  nano public/index.html"
echo "  (colar o conteúdo completo de financeiro_dashboard_completo.html)"
echo ""
read -p "Pressione ENTER quando tiver completado a atualização do frontend..."

if [ ! -f "public/index.html" ]; then
    echo "❌ ERRO: public/index.html não foi atualizado"
    exit 1
fi

# ════════════════════════════════════════════════════════════════
# FASE 3: ATUALIZAR BACKEND
# ════════════════════════════════════════════════════════════════
echo ""
echo "⚙️  FASE 3: Atualizando backend (server.js)..."
echo "⚠️  Este processo envolve 3 edições. Recomenda-se usar um editor..."
echo ""
echo "ALTERAÇÕES NECESSÁRIAS EM server.js:"
echo ""
echo "1️⃣  Adicionar função mergeDeep() ANTES da função sb()"
echo "2️⃣  Substituir o objeto DEFAULT_DATA completamente"
echo "3️⃣  Atualizar o bloco if (event.httpMethod === 'GET')"
echo ""
echo "Faça isso manualmente com:"
echo "  nano server.js"
echo ""
echo "Instruções detalhadas estão em DEPLOYMENT_SUMMARY.md"
echo ""
read -p "Pressione ENTER quando tiver completado as 3 alterações em server.js..."

# Validar se server.js contém a função mergeDeep
if ! grep -q "const mergeDeep" server.js; then
    echo "❌ ERRO: mergeDeep não foi adicionado a server.js"
    exit 1
fi

if ! grep -q "const merged = mergeDeep(DEFAULT_DATA, dados)" server.js; then
    echo "❌ ERRO: GET endpoint não foi atualizado corretamente"
    exit 1
fi

echo "✅ Alterações validadas em server.js"

# ════════════════════════════════════════════════════════════════
# FASE 4: RESTART E VERIFICAÇÃO
# ════════════════════════════════════════════════════════════════
echo ""
echo "🔄 FASE 4: Reiniciando PM2 e verificando..."
pm2 restart financeiro
pm2 save

echo "⏳ Aguardando 2 segundos para o servidor iniciar..."
sleep 2

echo ""
echo "📋 Status do PM2:"
pm2 status

echo ""
echo "🧪 Testando API — Verificando se dados estão completos..."
echo ""

# Teste 1: Verificar nome de Juliane
echo "Teste 1: Verificar nome de Juliane..."
JULIANE_NOME=$(curl -s http://localhost:3001/api/dados | jq -r '.pessoa.juliane.nome' 2>/dev/null || echo "ERROR")
if [ "$JULIANE_NOME" = "Juliane Benetti" ]; then
    echo "✅ Pessoa.juliane.nome = 'Juliane Benetti'"
else
    echo "❌ ERRO: pessoa.juliane.nome = '$JULIANE_NOME' (esperado: 'Juliane Benetti')"
fi

# Teste 2: Verificar dívida total
echo ""
echo "Teste 2: Verificar dívida total..."
DIVIDA_TOTAL=$(curl -s http://localhost:3001/api/dados | jq -r '.dividas.total' 2>/dev/null || echo "ERROR")
if [ "$DIVIDA_TOTAL" = "109838" ]; then
    echo "✅ Dividas.total = 109838"
else
    echo "❌ ERRO: dividas.total = '$DIVIDA_TOTAL' (esperado: 109838)"
fi

# Teste 3: Verificar saldo da conta
echo ""
echo "Teste 3: Verificar saldo da conta..."
SALDO_TOTAL=$(curl -s http://localhost:3001/api/dados | jq -r '.contas.saldo_total' 2>/dev/null || echo "ERROR")
if [ "$SALDO_TOTAL" = "5587" ]; then
    echo "✅ Contas.saldo_total = 5587"
else
    echo "❌ ERRO: contas.saldo_total = '$SALDO_TOTAL' (esperado: 5587)"
fi

# Logs
echo ""
echo "📊 Últimas linhas do log do PM2:"
pm2 logs financeiro --lines 10

# ════════════════════════════════════════════════════════════════
# RESUMO FINAL
# ════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOY CONCLUÍDO!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Abra https://financeiro.descontoirresistivel.com.br no navegador"
echo "2. Pressione F12 para abrir DevTools"
echo "3. Vá para a aba 'Console'"
echo "4. Verifique se NÃO há erros"
echo "5. Confirme que o dashboard carrega com:"
echo "   ✓ Abas: Diagnóstico, Fluxo de caixa, Cenários"
echo "   ✓ Todos os valores aparecem corretamente"
echo "   ✓ Dívida total: R$ 109.838"
echo "   ✓ Déficit mensal: -R$ 5.224"
echo ""
echo "🔄 ROLLBACK (se algo quebrar):"
echo "   cp server.js.backup.${BACKUP_TIMESTAMP} server.js"
echo "   cp public/index.html.backup.${BACKUP_TIMESTAMP} public/index.html"
echo "   pm2 restart financeiro"
echo ""
echo "════════════════════════════════════════════════════════════════"
