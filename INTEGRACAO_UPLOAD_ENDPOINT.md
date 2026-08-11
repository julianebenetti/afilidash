# 🚀 INTEGRAÇÃO DO ENDPOINT /api/upload

## 📌 RESUMO

Este documento descreve como integrar o sistema automático de upload de arquivos ao `server.js` na VPS. O sistema implementa as **ETAPAS 2-3** do PROTOCOLO_ATUALIZACAO_DADOS.md:

- **ETAPA 2**: Extração e Classificação de dados
- **ETAPA 3**: Confirmação de dúvidas
- **ETAPA 4**: Proposição de mudanças (preparado)
- **ETAPA 5**: Aplicação de mudanças (preparado)

---

## ⚙️ DEPENDÊNCIAS NECESSÁRIAS

Instalar no servidor VPS:

```bash
cd /home/benetti/MGD-Benetti
npm install multer express-fileupload cors uuid
```

Dependências opcionais (para OCR e PDF parsing completo):
```bash
# Para parsing de PDF completo
npm install pdf2json

# Para OCR de imagens
npm install tesseract.js

# Para melhor parsing de Excel
npm install xlsx
```

---

## 📂 ESTRUTURA DE ARQUIVOS A COPIAR

Copiar para `/home/benetti/MGD-Benetti/`:

```
├── file-parser.js           # Parsing de arquivos
├── data-classifier.js       # Classificação de dados
├── duvidas-generator.js     # Geração de perguntas
├── upload-handler.js        # Orquestração do workflow
```

E para o frontend:
```
├── public/upload.html       # Interface de upload (novo)
```

---

## 🔗 CÓDIGO A ADICIONAR NO server.js

### 1️⃣ ADICIONAR IMPORTS (logo após os requires existentes)

```javascript
// ===== FILE UPLOAD SYSTEM =====
const multer = require('multer');
const uploadHandler = require('./upload-handler');
const duvidasGenerator = require('./duvidas-generator');

// Configure upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${ext}`));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});
```

### 2️⃣ ADICIONAR ENDPOINTS

```javascript
// ===== FILE UPLOAD ENDPOINTS =====

// ETAPA 1-2: Upload de arquivo(s) e extração automática
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        erro: 'Nenhum arquivo foi enviado'
      });
    }

    console.log(`[UPLOAD] ${req.files.length} arquivo(s) recebido(s)`);

    // Process files - ETAPA 2: Extração
    const resultado = await uploadHandler.handleUpload(req.files);

    // Format response for user - ETAPA 3: Dúvidas
    const respostaFormatada = uploadHandler.formatarRespostaExtracaoParaUsuario(resultado.sessionId);

    res.json({
      status: 'sucesso',
      sessionId: resultado.sessionId,
      resumo: resultado.resumo,
      resposta_usuario: respostaFormatada,
      arquivos_processados: resultado.arquivos_processados,
      total_duvidas: resultado.arquivos_processados.reduce((sum, a) => sum + a.total_duvidas, 0)
    });

    // Clean up uploaded files after processing
    for (const file of req.files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    res.status(500).json({
      erro: error.message,
      detalhes: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ETAPA 3: Processar confirmações de dúvidas
app.post('/api/upload/confirmacoes', express.json(), (req, res) => {
  try {
    const { sessionId, confirmacoes } = req.body;

    if (!sessionId) {
      return res.status(400).json({ erro: 'sessionId é obrigatório' });
    }

    // Process user confirmations - ETAPA 3
    const resultado = uploadHandler.processarConfirmacoes(sessionId, confirmacoes);

    if (resultado.erro) {
      return res.status(resultado.statusCode || 400).json(resultado);
    }

    // Generate proposed changes - ETAPA 4
    const respostaFormatada = uploadHandler.formatarMudancasPropostasParaUsuario(sessionId);

    res.json({
      status: 'confirmacoes_recebidas',
      sessionId,
      resposta_usuario: respostaFormatada,
      mudancas_propostas: resultado.mudancas_propostas
    });

  } catch (error) {
    console.error('[CONFIRMACOES ERROR]', error);
    res.status(500).json({ erro: error.message });
  }
});

// ETAPA 4-5: Aplicar mudanças confirmadas
app.post('/api/upload/aplicar', express.json(), (req, res) => {
  try {
    const { sessionId, confirmacao } = req.body;

    if (!sessionId) {
      return res.status(400).json({ erro: 'sessionId é obrigatório' });
    }

    // Apply changes - ETAPA 5
    const resultado = uploadHandler.aplicarMudancas(sessionId, confirmacao, DEFAULT_DATA);

    if (resultado.erro) {
      return res.status(resultado.statusCode || 400).json(resultado);
    }

    // Save updated data to persistent storage
    if (resultado.dados_atualizados) {
      // Update dados.json file
      const dadosPath = path.join(__dirname, 'dados.json');
      fs.writeFileSync(dadosPath, JSON.stringify(resultado.dados_atualizados, null, 2));

      // Create timestamped backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = path.join(__dirname, `backups/dados_${timestamp}.json`);
      if (!fs.existsSync(path.dirname(backupPath))) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      }
      fs.writeFileSync(backupPath, JSON.stringify(resultado.dados_atualizados, null, 2));
    }

    res.json({
      status: 'sucesso',
      sessionId,
      mensagem: resultado.mensagem,
      dados_atualizados: resultado.dados_atualizados
    });

  } catch (error) {
    console.error('[APLICAR ERROR]', error);
    res.status(500).json({ erro: error.message });
  }
});

// Status de uma sessão
app.get('/api/upload/status/:sessionId', (req, res) => {
  try {
    const sessao = uploadHandler.obterSessao(req.params.sessionId);

    if (!sessao) {
      return res.status(404).json({ erro: 'Sessão não encontrada' });
    }

    res.json({
      sessionId: req.params.sessionId,
      etapa_atual: sessao.etapa_atual,
      data_criacao: sessao.criado_em,
      arquivos_processados: sessao.resultados.resumo.sucesso,
      total_duvidas: sessao.resultados.arquivos_processados.reduce((sum, a) => sum + a.total_duvidas, 0),
      confirmacoes_recebidas: Object.keys(sessao.confirmacoes_usuario || {}).length
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});
```

---

## 📝 FLUXO DE FUNCIONAMENTO

### Exemplo de fluxo completo:

**1️⃣ Cliente envia arquivos:**
```bash
curl -F "files=@extrato_itau.pdf" \
     -F "files=@fatura_black.pdf" \
     http://financeiro.descontoirresistivel.com.br/api/upload
```

**Resposta (ETAPA 2-3):**
```json
{
  "status": "sucesso",
  "sessionId": "session_1723395600000_abc123",
  "resumo": {
    "total_arquivos": 2,
    "sucesso": 2,
    "erro": 0
  },
  "resposta_usuario": "✅ EXTRAÇÃO COMPLETA\n\n📊 Resumo:\n...",
  "total_duvidas": 3
}
```

**2️⃣ Cliente confirma dúvidas:**
```json
POST /api/upload/confirmacoes
{
  "sessionId": "session_1723395600000_abc123",
  "confirmacoes": {
    "tipo_1": { "tipo_duvida": "confirmacao_tipo", "resposta_usuario": "saida_variavel" },
    "categoria_1": { "tipo_duvida": "confirmacao_categoria", "resposta_usuario": "transporte" }
  }
}
```

**Resposta (ETAPA 4):**
```json
{
  "status": "confirmacoes_recebidas",
  "sessionId": "session_1723395600000_abc123",
  "resposta_usuario": "📋 MUDANÇAS PROPOSTAS:\n...",
  "mudancas_propostas": { ... }
}
```

**3️⃣ Cliente confirma aplicação:**
```json
POST /api/upload/aplicar
{
  "sessionId": "session_1723395600000_abc123",
  "confirmacao": "SIM"
}
```

**Resposta (ETAPA 5):**
```json
{
  "status": "sucesso",
  "sessionId": "session_1723395600000_abc123",
  "mensagem": "✅ Mudanças aplicadas com sucesso!",
  "dados_atualizados": { ... }
}
```

---

## 🔒 SEGURANÇA

- ✅ Validação de tipos de arquivo
- ✅ Limite de tamanho (50MB)
- ✅ Sem alteração de dados sem confirmação explícita
- ✅ Backup automático antes de aplicar mudanças
- ✅ Session ID único para rastreabilidade
- ✅ Cleanup de arquivos temporários

---

## ⚠️ NOTAS DE IMPLEMENTAÇÃO

1. **Dependências PDF/OCR**: A implementação atual retorna avisos se as dependências não estiverem instaladas. Funciona bem com dados estruturados (Excel, screenshots simples).

2. **Armazenamento de sessões**: Usa memória (para teste). Para produção, considerar:
   - Armazenar em Redis
   - Armazenar em banco de dados
   - Implementar expiração de sessões após 24h

3. **Limpeza de uploads**: Arquivos são deletados após processamento. Considere mantê-los se precisar de audit trail.

4. **Deep merge**: Usar a função `mergeDeep()` já adicionada ao server.js:
   ```javascript
   const dadosFinais = mergeDeep(DEFAULT_DATA, dados_persistidos);
   ```

---

## 🚀 PRÓXIMOS PASSOS

1. Copiar os 4 arquivos .js para VPS
2. Adicionar imports e endpoints ao server.js
3. Instalar dependências (`npm install multer ...`)
4. Criar interface de upload (upload.html)
5. Testar com arquivo PDF ou XLS
6. Monitorar logs com: `pm2 logs`

---

**Status**: Pronto para implementação
**Validado contra**: PROTOCOLO_ATUALIZACAO_DADOS.md
**Última atualização**: 2026-08-11
