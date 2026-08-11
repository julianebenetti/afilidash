const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));

const dataDir = path.join(__dirname, 'data');
const apontamentosFile = path.join(dataDir, 'apontamentos.json');

// Criar diretório se não existir
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar arquivo de apontamentos
function initApontamentos() {
  if (!fs.existsSync(apontamentosFile)) {
    fs.writeFileSync(apontamentosFile, JSON.stringify([], null, 2));
  }
}

initApontamentos();

// GET - Listar apontamentos pendentes
app.get('/api/apontamentos', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(apontamentosFile, 'utf8'));
    res.json({ ok: true, dados: data.filter(a => a.status === 'pendente') });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// POST - Criar novo apontamento
app.post('/api/apontamentos', (req, res) => {
  try {
    const { tipo, categoria, valor, data, descricao, aplicarAgora } = req.body;

    if (!tipo || !categoria || !valor || !data) {
      return res.status(400).json({ ok: false, erro: 'Campos obrigatórios faltando' });
    }

    const apontamento = {
      id: Date.now().toString(),
      tipo,
      categoria,
      valor: parseFloat(valor),
      data,
      descricao: descricao || '',
      status: aplicarAgora ? 'aplicado' : 'pendente',
      criadoEm: new Date().toISOString()
    };

    const data_atual = JSON.parse(fs.readFileSync(apontamentosFile, 'utf8'));
    data_atual.push(apontamento);
    fs.writeFileSync(apontamentosFile, JSON.stringify(data_atual, null, 2));

    res.json({ ok: true, apontamento });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// POST - Confirmar apontamento pendente
app.post('/api/apontamentos/:id/confirmar', (req, res) => {
  try {
    const { id } = req.params;
    const data_atual = JSON.parse(fs.readFileSync(apontamentosFile, 'utf8'));

    const apontamento = data_atual.find(a => a.id === id);
    if (!apontamento) {
      return res.status(404).json({ ok: false, erro: 'Apontamento não encontrado' });
    }

    apontamento.status = 'aplicado';
    fs.writeFileSync(apontamentosFile, JSON.stringify(data_atual, null, 2));

    res.json({ ok: true, apontamento });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// DELETE - Excluir apontamento
app.delete('/api/apontamentos/:id', (req, res) => {
  try {
    const { id } = req.params;
    let data_atual = JSON.parse(fs.readFileSync(apontamentosFile, 'utf8'));

    const index = data_atual.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ ok: false, erro: 'Apontamento não encontrado' });
    }

    const removido = data_atual.splice(index, 1);
    fs.writeFileSync(apontamentosFile, JSON.stringify(data_atual, null, 2));

    res.json({ ok: true, removido: removido[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🟡servidor financeiro rodando em http://localhost:${PORT}`);
  console.log(`🟡dados armazenados em: ${apontamentosFile}`);
});
