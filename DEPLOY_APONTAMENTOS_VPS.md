# 🚀 Deploy da Aba "Apontamentos" no VPS

Siga estes passos para integrar a aba "Apontamentos" no seu dashboard financeiro no VPS.

## Passo 1: Preparar o Arquivo de Endpoints

Crie o arquivo com os novos endpoints ou copie direto do repositório GitHub. O arquivo `apontamentos-endpoints.js` já está disponível.

## Passo 2: Adicionar Endpoints ao server.js

### Acesse o VPS e edite server.js:

```bash
# Conectar ao VPS
ssh seu_usuario@seu_servidor_vps

# Navegue até o diretório
cd /home/benetti/MGD-Benetti

# Faça backup do arquivo atual (segurança)
cp server.js server.js.backup.$(date +%s)

# Abra o arquivo para edição
nano server.js
```

### Localize o endpoint `/api/upload/status/:sessionId`

Procure por uma linha como:
```javascript
app.get('/api/upload/status/:sessionId', (req, res) => {
```

### Adicione os novos endpoints após a última função de upload

Logo antes de `module.exports` ou antes do `app.listen`, adicione:

```javascript
// ═══════════════════════════════════════════
// APONTAMENTOS ENDPOINTS
// ═══════════════════════════════════════════

// POST /api/apontamentos - Receber novo apontamento
app.post('/api/apontamentos', express.json(), async (req, res) => {
  try {
    const { id, tipo, categoria, valor, data, descricao, status, criado_em } = req.body;

    if (!id || !tipo || !categoria || !valor || !data) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const apontamentosPath = path.join(__dirname, 'apontamentos.json');
    let apontamentos = [];

    if (fs.existsSync(apontamentosPath)) {
      const content = fs.readFileSync(apontamentosPath, 'utf8');
      apontamentos = JSON.parse(content || '[]');
    }

    const novoApontamento = {
      id,
      tipo,
      categoria,
      valor: parseFloat(valor),
      data,
      descricao: descricao || '',
      status: status || 'pendente',
      criado_em: criado_em || new Date().toISOString(),
    };

    apontamentos.push(novoApontamento);
    fs.writeFileSync(apontamentosPath, JSON.stringify(apontamentos, null, 2));

    if (status === 'aplicar' || status === 'aplicado') {
      try {
        const dadosPath = path.join(__dirname, 'dados.json');
        let defaultData = { entradas: [], saidas: [] };

        if (fs.existsSync(dadosPath)) {
          const content = fs.readFileSync(dadosPath, 'utf8');
          defaultData = JSON.parse(content);
        }

        const novoItem = {
          id: `apoint_${Date.now()}`,
          tipo: novoApontamento.tipo,
          categoria: novoApontamento.categoria,
          valor: novoApontamento.valor,
          data: novoApontamento.data,
          descricao: novoApontamento.descricao,
          origem: 'apontamento',
          criado_em: novoApontamento.criado_em,
        };

        if (novoApontamento.tipo === 'entrada') {
          defaultData.entradas = defaultData.entradas || [];
          defaultData.entradas.push(novoItem);
        } else {
          defaultData.saidas = defaultData.saidas || [];
          defaultData.saidas.push(novoItem);
        }

        fs.writeFileSync(dadosPath, JSON.stringify(defaultData, null, 2));

        apontamentos = apontamentos.map(a =>
          a.id === id ? { ...a, status: 'aplicado' } : a
        );
        fs.writeFileSync(apontamentosPath, JSON.stringify(apontamentos, null, 2));
      } catch (e) {
        console.error('Erro ao aplicar apontamento aos dados:', e);
      }
    }

    return res.json({ ok: true, id, mensagem: 'Apontamento recebido com sucesso' });
  } catch (e) {
    console.error('Erro em POST /api/apontamentos:', e);
    return res.status(500).json({ erro: e.message });
  }
});

// GET /api/apontamentos - Listar apontamentos pendentes
app.get('/api/apontamentos', (req, res) => {
  try {
    const apontamentosPath = path.join(__dirname, 'apontamentos.json');
    let apontamentos = [];

    if (fs.existsSync(apontamentosPath)) {
      const content = fs.readFileSync(apontamentosPath, 'utf8');
      apontamentos = JSON.parse(content || '[]');
    }

    const pendentes = apontamentos.filter(a => a.status === 'pendente');
    return res.json({ ok: true, dados: pendentes });
  } catch (e) {
    console.error('Erro em GET /api/apontamentos:', e);
    return res.status(500).json({ erro: e.message });
  }
});

// POST /api/apontamentos/:id/confirmar - Aplicar apontamento pendente
app.post('/api/apontamentos/:id/confirmar', express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const apontamentosPath = path.join(__dirname, 'apontamentos.json');

    if (!fs.existsSync(apontamentosPath)) {
      return res.status(404).json({ erro: 'Apontamento não encontrado' });
    }

    const content = fs.readFileSync(apontamentosPath, 'utf8');
    let apontamentos = JSON.parse(content || '[]');

    const apontamento = apontamentos.find(a => a.id === id);
    if (!apontamento) {
      return res.status(404).json({ erro: 'Apontamento não encontrado' });
    }

    try {
      const dadosPath = path.join(__dirname, 'dados.json');
      let defaultData = { entradas: [], saidas: [] };

      if (fs.existsSync(dadosPath)) {
        const content = fs.readFileSync(dadosPath, 'utf8');
        defaultData = JSON.parse(content);
      }

      const novoItem = {
        id: `apoint_${Date.now()}`,
        tipo: apontamento.tipo,
        categoria: apontamento.categoria,
        valor: apontamento.valor,
        data: apontamento.data,
        descricao: apontamento.descricao,
        origem: 'apontamento',
        criado_em: apontamento.criado_em,
      };

      if (apontamento.tipo === 'entrada') {
        defaultData.entradas = defaultData.entradas || [];
        defaultData.entradas.push(novoItem);
      } else {
        defaultData.saidas = defaultData.saidas || [];
        defaultData.saidas.push(novoItem);
      }

      fs.writeFileSync(dadosPath, JSON.stringify(defaultData, null, 2));
    } catch (e) {
      console.error('Erro ao aplicar apontamento aos dados:', e);
      return res.status(500).json({ erro: 'Erro ao aplicar apontamento: ' + e.message });
    }

    apontamentos = apontamentos.map(a =>
      a.id === id ? { ...a, status: 'aplicado', aplicado_em: new Date().toISOString() } : a
    );
    fs.writeFileSync(apontamentosPath, JSON.stringify(apontamentos, null, 2));

    return res.json({ ok: true, id, mensagem: 'Apontamento aplicado com sucesso' });
  } catch (e) {
    console.error('Erro em POST /api/apontamentos/:id/confirmar:', e);
    return res.status(500).json({ erro: e.message });
  }
});

// DELETE /api/apontamentos/:id - Excluir apontamento
app.delete('/api/apontamentos/:id', express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const apontamentosPath = path.join(__dirname, 'apontamentos.json');

    if (!fs.existsSync(apontamentosPath)) {
      return res.status(404).json({ erro: 'Apontamento não encontrado' });
    }

    const content = fs.readFileSync(apontamentosPath, 'utf8');
    let apontamentos = JSON.parse(content || '[]');

    const idx = apontamentos.findIndex(a => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ erro: 'Apontamento não encontrado' });
    }

    apontamentos.splice(idx, 1);
    fs.writeFileSync(apontamentosPath, JSON.stringify(apontamentos, null, 2));

    return res.json({ ok: true, id, mensagem: 'Apontamento excluído com sucesso' });
  } catch (e) {
    console.error('Erro em DELETE /api/apontamentos/:id:', e);
    return res.status(500).json({ erro: e.message });
  }
});
```

## Passo 3: Criar arquivo apontamentos.json

Ainda no VPS, execute os comandos abaixo:

```bash
# Criar arquivo vazio
touch /home/benetti/MGD-Benetti/apontamentos.json

# Inicializar com array vazio
echo "[]" > /home/benetti/MGD-Benetti/apontamentos.json

# Verificar permissões
ls -la /home/benetti/MGD-Benetti/apontamentos.json

# Deve mostrar algo como:
# -rw-r--r-- 1 benetti benetti 2 Aug 11 12:34 apontamentos.json
```

## Passo 4: Validar Sintaxe do server.js

Antes de reiniciar, valide a sintaxe:

```bash
cd /home/benetti/MGD-Benetti
node -c server.js

# Deve retornar sem erros
```

## Passo 5: Reiniciar o Servidor

```bash
# Reiniciar o processo PM2
pm2 restart financeiro

# Verificar se está rodando
pm2 status

# Deve mostrar "online" para o processo financeiro
```

## Passo 6: Testar os Endpoints (VPS)

### Testar GET (listar apontamentos vazios):
```bash
curl https://financeiro.descontoirresistivel.com.br/api/apontamentos
```

### Resposta esperada:
```json
{"ok":true,"dados":[]}
```

### Testar POST (criar novo apontamento):
```bash
curl -X POST https://financeiro.descontoirresistivel.com.br/api/apontamentos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_'$(date +%s)'",
    "tipo": "entrada",
    "categoria": "vendas",
    "valor": 500.00,
    "data": "2024-08-11",
    "descricao": "Teste de apontamento",
    "status": "pendente"
  }'
```

### Resposta esperada:
```json
{"ok":true,"id":"test_...","mensagem":"Apontamento recebido com sucesso"}
```

## Passo 7: Acessar no Dashboard

1. Abra o navegador em: `https://financeiro.descontoirresistivel.com.br`
2. Clique na aba **📝 Apontamentos**
3. Clique em **+ Novo Apontamento**
4. Preencha os dados:
   - **Tipo**: Selecione "Entrada"
   - **Categoria**: Selecione "Vendas"
   - **Valor**: Digite `1500.00`
   - **Data**: A data de hoje será preenchida automaticamente
   - **Descrição**: Digite algo como "Teste do novo apontamento"
   - **Ação**: Selecione "Deixar como pendência"
5. Clique em **✓ Enviar**
6. Você deve ver a mensagem "✓ Apontamento deixado como pendência"
7. O apontamento aparecerá na tabela abaixo com opções de ✓ (confirmar) e ✕ (descartar)

## Troubleshooting

### Erro: "Cannot GET /api/apontamentos"
- Verifique se `pm2 restart financeiro` foi executado
- Verifique a sintaxe: `node -c server.js`
- Verifique os logs: `pm2 logs financeiro`

### Erro: "Arquivo não encontrado"
- Verifique se `apontamentos.json` existe: `ls -la /home/benetti/MGD-Benetti/apontamentos.json`
- Verifique permissões: deve ser legível/gravável

### Dados não aparecem na tabela
- Abra o Console do navegador (F12)
- Verifique se há erros JavaScript
- Verifique se `renderApontamentosPendentes()` foi chamada

## Próximas Melhorias (Opcional)

1. Adicionar suporte a categorias dinâmicas (via configuração)
2. Exportar histórico de apontamentos em CSV
3. Implementar filtros por período
4. Adicionar validação de duplicatas
5. Criar relatório de apontamentos aplicados vs descartados

## Rollback (Se necessário)

Caso algo não funcione:

```bash
# Restaurar o backup
cd /home/benetti/MGD-Benetti
cp server.js server.js.com-erro
cp server.js.backup.* server.js

# Reiniciar
pm2 restart financeiro
```

---

✅ Após completar estes passos, a aba "Apontamentos" estará totalmente funcional!
