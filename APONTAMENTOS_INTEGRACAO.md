# Integração da Aba "Apontamentos" (VPS)

## Resumo

A aba "Apontamentos" permite entrada manual de dados financeiros sem necessidade de upload de arquivos. Os dados podem ser deixados como pendência para revisão posterior, ou aplicados imediatamente ao dashboard.

## O que foi adicionado

### Frontend (index.html)
- Nova aba "📝 Apontamentos" no topo do dashboard
- Formulário para entrada manual com campos:
  - **Tipo**: Entrada / Saída Fixa / Saída Variável
  - **Categoria**: 8 categorias predefinidas (Vendas, Comissão, Marketing, etc)
  - **Valor**: Campo numérico para valores em R$
  - **Data**: Seletor de data
  - **Descrição**: Campo de texto opcional
  - **Ação**: Radio buttons para "Deixar como pendência" ou "Aplicar agora"
- Tabela de apontamentos pendentes com botões de ação:
  - ✓ Confirmar (aplicar apontamento)
  - ✕ Descartar (remover pendência)

### Backend (Endpoints para adicionar em server.js)

#### 1. POST /api/apontamentos
Recebe novo apontamento e armazena em `apontamentos.json`

**Request Body:**
```json
{
  "id": "apoint_1723401234567_abc123",
  "tipo": "entrada",
  "categoria": "vendas",
  "valor": 1500.00,
  "data": "2024-08-11",
  "descricao": "Venda produto X",
  "status": "pendente",
  "criado_em": "2024-08-11T10:30:00.000Z"
}
```

**Response:** `{ ok: true, id: "...", mensagem: "..." }`

#### 2. GET /api/apontamentos
Lista todos os apontamentos com status "pendente"

**Response:**
```json
{
  "ok": true,
  "dados": [
    {
      "id": "apoint_...",
      "tipo": "entrada",
      "categoria": "vendas",
      "valor": 1500,
      "data": "2024-08-11",
      "descricao": "Venda produto X",
      "status": "pendente",
      "criado_em": "2024-08-11T10:30:00.000Z"
    }
  ]
}
```

#### 3. POST /api/apontamentos/:id/confirmar
Aplica um apontamento pendente aos dados financeiros em `dados.json`

**Response:** `{ ok: true, id: "...", mensagem: "Apontamento aplicado com sucesso" }`

#### 4. DELETE /api/apontamentos/:id
Remove um apontamento pendente

**Response:** `{ ok: true, id: "...", mensagem: "Apontamento excluído com sucesso" }`

## Instalação no VPS

### 1. Adicionar os endpoints ao server.js

Abra o arquivo `/home/benetti/MGD-Benetti/server.js` e localize onde estão os outros endpoints `/api/upload`.

**Procure por:**
```javascript
// Após os endpoints POST /api/upload/aplicar
app.get('/api/upload/status/:sessionId', (req, res) => {
```

**Adicione logo após esse endpoint (antes de `module.exports` ou antes do `app.listen`):**

```javascript
// ═══════════════════════════════════════════
// APONTAMENTOS ENDPOINTS
// ═══════════════════════════════════════════

// Apontamentos storage file path: <vps>/apontamentos.json

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

    // Se status é "aplicado", fazer merge com DEFAULT_DATA
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

        // Atualizar status do apontamento para aplicado
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

    // Aplicar aos dados
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

    // Atualizar status
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

    // Remover apontamento
    apontamentos.splice(idx, 1);
    fs.writeFileSync(apontamentosPath, JSON.stringify(apontamentos, null, 2));

    return res.json({ ok: true, id, mensagem: 'Apontamento excluído com sucesso' });
  } catch (e) {
    console.error('Erro em DELETE /api/apontamentos/:id:', e);
    return res.status(500).json({ erro: e.message });
  }
});
```

### 2. Criar arquivo apontamentos.json no VPS

No VPS, navegue até `/home/benetti/MGD-Benetti/` e crie um arquivo vazio:

```bash
touch /home/benetti/MGD-Benetti/apontamentos.json
echo "[]" > /home/benetti/MGD-Benetti/apontamentos.json
chmod 644 /home/benetti/MGD-Benetti/apontamentos.json
```

### 3. Reiniciar o servidor

```bash
cd /home/benetti/MGD-Benetti
pm2 restart financeiro
```

### 4. Testar os endpoints

```bash
# Listar apontamentos pendentes (deve retornar array vazio inicialmente)
curl https://financeiro.descontoirresistivel.com.br/api/apontamentos

# Criar novo apontamento
curl -X POST https://financeiro.descontoirresistivel.com.br/api/apontamentos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "tipo": "entrada",
    "categoria": "vendas",
    "valor": 100.00,
    "data": "2024-08-11",
    "descricao": "Teste",
    "status": "pendente"
  }'
```

## Uso (Frontend)

1. **Acessar a aba "Apontamentos"**: Clique em "📝 Apontamentos" no topo do dashboard
2. **Criar novo apontamento**: Clique em "+ Novo Apontamento"
3. **Preencher o formulário**:
   - Selecione o tipo de movimento
   - Escolha a categoria
   - Insira o valor em R$
   - Selecione a data
   - Adicione uma descrição (opcional)
4. **Escolher ação**:
   - "Deixar como pendência": O apontamento fica na lista de pendências para revisão posterior
   - "Aplicar agora": O apontamento é imediatamente incluído nos dados financeiros
5. **Gerenciar pendências**: Na tabela abaixo, você pode:
   - ✓ Confirmar: Aplicar a pendência aos dados
   - ✕ Descartar: Remover a pendência

## Estrutura dos Arquivos

### apontamentos.json
Armazena histórico completo de apontamentos (pendentes, aplicados e descartados)

```json
[
  {
    "id": "apoint_1723401234567_abc123",
    "tipo": "entrada",
    "categoria": "vendas",
    "valor": 1500.00,
    "data": "2024-08-11",
    "descricao": "Venda produto X",
    "status": "pendente",
    "criado_em": "2024-08-11T10:30:00.000Z"
  },
  {
    "id": "apoint_1723401234567_def456",
    "tipo": "saida-fixa",
    "categoria": "operacional",
    "valor": 500.00,
    "data": "2024-08-10",
    "descricao": "Aluguel escritório",
    "status": "aplicado",
    "criado_em": "2024-08-10T14:20:00.000Z",
    "aplicado_em": "2024-08-10T15:00:00.000Z"
  }
]
```

### dados.json
Quando um apontamento é aplicado, ele é adicionado a este arquivo com `origem: "apontamento"`.

## Fluxo de Dados

```
Frontend (apontamentos.html)
  ↓
POST /api/apontamentos (novo apontamento)
  ↓
Salvar em apontamentos.json com status="pendente"
  ↓
GET /api/apontamentos (carregar pendências)
  ↓
Mostrar na tabela
  ↓
Usuário clica em "Confirmar"
  ↓
POST /api/apontamentos/:id/confirmar
  ↓
Adiciona item em dados.json
  ↓
Atualiza status para "aplicado" em apontamentos.json
```

## Notas

- Os apontamentos são armazenados localmente no servidor
- Quando "Aplicar agora" é selecionado, o item é adicionado imediatamente a `dados.json`
- Os dados nunca são perdidos, apenas seu status muda (pendente → aplicado)
- Cada apontamento tem ID único gerado pelo frontend
- A descrição é opcional e ajuda na auditoria

## Próximos Passos Opcionais

1. Adicionar backup automático de apontamentos
2. Exportar histórico de apontamentos em CSV
3. Integrar com sistema de auditoria/logs
4. Adicionar filtros por período/categoria na visualização de pendências
5. Implementar webhook para notificações
