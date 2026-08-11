// ═══════════════════════════════════════════
// APONTAMENTOS ENDPOINTS
// Add these endpoints to server.js on the VPS
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
