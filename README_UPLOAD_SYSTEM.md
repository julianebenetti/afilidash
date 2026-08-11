# 📊 Sistema de Upload Automático de Dados

**Status**: ✅ Pronto para Integração

---

## 🎯 O Que Foi Construído

Um sistema completo de importação automática de dados financeiros que implementa o **PROTOCOLO_ATUALIZACAO_DADOS.md** em código. O sistema permite que você envie documentos financeiros (PDFs, XLS, imagens) e o sistema automaticamente:

1. ✅ **ETAPA 2**: Extrai dados de múltiplos formatos
2. ✅ **ETAPA 3**: Identifica itens ambíguos e gera dúvidas
3. ✅ **ETAPA 4**: Propõe mudanças com análise de impacto
4. ✅ **ETAPA 5**: Aplica mudanças após confirmação do usuário

---

## 📦 Arquivos Criados

### 1️⃣ **Módulos de Backend** (Node.js/Express)

#### `file-parser.js` (292 linhas)
- **Responsabilidade**: Extrair dados de diferentes formatos
- **Suporta**: 
  - PDF (extratos bancários, faturas)
  - XLS/XLSX (planilhas estruturadas)
  - PNG/JPG/GIF (OCR de screenshots)
- **Dependências opcionais**: pdf2json, xlsx, tesseract.js
- **Saída**: Objeto estruturado com dados extraídos

**Funções principais**:
```javascript
parseFile(filePath)              // Parse arquivo único
parseMultipleFiles(filePaths)    // Parse múltiplos arquivos
parseBankStatementPDF(filePath)  // Extrato bancário específico
parseCreditCardPDF(filePath)     // Fatura cartão específica
parseExcelFile(filePath)         // Planilha Excel
parseImageOCR(filePath)          // Screenshot com OCR
```

---

#### `data-classifier.js` (356 linhas)
- **Responsabilidade**: Classificar dados extraídos
- **Identifica automaticamente**:
  - Tipo de lançamento (entrada, saída_fixa, saída_variável)
  - Categoria (transporte, supermercado, educação, etc)
  - Cartão de crédito (Black, Azul, Infinite, Amazon)
  - Banco (Itaú, Bradesco, Caixa, etc)
  - Esfera (pessoal vs negócio)

**Funções principais**:
```javascript
identificarTipo(descricao)           // Entrada vs Saída
classificarCategoria(descricao)      // 9 categorias
identificarCartao(descricao)         // Qual cartão?
identificarBanco(descricao)          // Qual banco?
extrairValores(texto)                // Encontrar R$ valores
classificarLancamento(desc, valor)   // Classificação completa
procesarResultadoExtraction(parsing) // Processar resultado
gerarDuvidas(processados)            // Consolidar perguntas
```

---

#### `duvidas-generator.js` (357 linhas)
- **Responsabilidade**: Gerar perguntas para confirmação
- **Tipos de perguntas**:
  - ❓ Tipo (entrada, saída fixa, saída variável)
  - 🏷️ Categoria (transporte, supermercado, etc)
  - 🎴 Cartão (qual cartão de crédito)
  - 👤 Esfera (pessoal ou negócio)
  - ⚡ Conflito (valores diferentes)
  - ✅ Confirmação simples

**Funções principais**:
```javascript
gerarPerguntaTipo(descricao, valor)
gerarPerguntaCategoria(descricao, valor)
gerarPerguntaCartao(descricao, valor)
gerarPerguntaEsfera(descricao, valor)
gerarPerguntaConfirmacao(descricao, valor)
gerarPerguntaConflito(desc, valorAnt, valorNov)
gerarRespostaDuvidas(arquivo, duvidas, total)
procesarRespostas(duvidas, respostas_usuario)
```

---

#### `upload-handler.js` (488 linhas)
- **Responsabilidade**: Orquestrar todo o fluxo
- **Gerencia**:
  - Sessões de upload (com IDs únicos)
  - Processamento em etapas
  - Armazenamento de confirmações
  - Geração de mudanças propostas
  - Aplicação de mudanças

**Funções principais**:
```javascript
handleUpload(files, sessionId)              // ETAPA 1-2
processarConfirmacoes(sessionId, conf)      // ETAPA 3
gerarMudancasPropostas(sessao)              // ETAPA 4
aplicarMudancas(sessionId, conf, DEFAULT_DATA)  // ETAPA 5
obterSessao(sessionId)                      // Status
formatarRespostaExtracaoParaUsuario(id)     // Resposta user
formatarMudancasPropostasParaUsuario(id)    // Proposta user
```

---

### 2️⃣ **Interface Frontend**

#### `public/upload.html` (445 linhas)
- **Responsabilidade**: Interface de usuário
- **Recursos**:
  - 🎯 Indicador visual de progresso (4 etapas)
  - 📁 Drag-and-drop de arquivos
  - 📋 Listagem de arquivos selecionados
  - ⚠️ Exibição de dúvidas encontradas
  - 📝 Formulário de confirmação
  - 📊 Preview de mudanças
  - ✅ Relatório final

---

### 3️⃣ **Documentação**

#### `INTEGRACAO_UPLOAD_ENDPOINT.md` (186 linhas)
Guia completo para integração no `server.js` da VPS contendo:
- Dependências NPM necessárias
- Código pronto para copiar/colar nos endpoints
- Exemplo de fluxo completo
- Considerações de segurança
- Notas de implementação

---

## 🚀 Arquitetura do Sistema

```
[Cliente envia arquivos]
           ↓
   [file-parser.js]
   ├─ Extrai dados
   └─ Retorna JSON
           ↓
[data-classifier.js]
   ├─ Classifica tipo
   ├─ Identifica categoria
   └─ Marca dúvidas
           ↓
[duvidas-generator.js]
   ├─ Gera perguntas
   └─ Formata resposta
           ↓
[upload-handler.js - ETAPA 3]
   └─ Armazena em sessão
           ↓
   [Cliente responde perguntas]
           ↓
[upload-handler.js - ETAPA 4]
   ├─ Mapeia respostas
   ├─ Gera mudanças
   └─ Calcula impactos
           ↓
   [Cliente confirma mudanças]
           ↓
[upload-handler.js - ETAPA 5]
   ├─ Faz backup
   ├─ Aplica mudanças
   ├─ Salva dados
   └─ Retorna atualizado
           ↓
[Dashboard atualizado]
```

---

## 📋 Endpoints de API

### 1. Upload de Arquivos
```
POST /api/upload
Content-Type: multipart/form-data

Parâmetros:
  files: [File] - Até 10 arquivos, 50MB cada

Respostas:
  - 200: { status, sessionId, resumo, resposta_usuario, total_duvidas }
  - 400: { erro: "Nenhum arquivo enviado" }
  - 500: { erro: "Mensagem de erro" }
```

**Exemplo com cURL**:
```bash
curl -F "files=@extrato.pdf" \
     -F "files=@fatura.xlsx" \
     http://localhost:3001/api/upload
```

---

### 2. Processar Confirmações
```
POST /api/upload/confirmacoes
Content-Type: application/json

Body:
{
  "sessionId": "session_123...",
  "confirmacoes": {
    "tipo_1": { "resposta_usuario": "saida_variavel" },
    "categoria_1": { "resposta_usuario": "transporte" }
  }
}

Resposta:
{
  "status": "confirmacoes_recebidas",
  "sessionId": "...",
  "resposta_usuario": "📋 MUDANÇAS PROPOSTAS...",
  "mudancas_propostas": { ... }
}
```

---

### 3. Aplicar Mudanças
```
POST /api/upload/aplicar
Content-Type: application/json

Body:
{
  "sessionId": "session_123...",
  "confirmacao": "SIM"
}

Resposta:
{
  "status": "sucesso",
  "sessionId": "...",
  "mensagem": "✅ Mudanças aplicadas com sucesso!",
  "dados_atualizados": { ... }
}
```

---

### 4. Status da Sessão
```
GET /api/upload/status/:sessionId

Resposta:
{
  "sessionId": "...",
  "etapa_atual": "confirmacao_duvidas",
  "data_criacao": "2026-08-11T10:30:00Z",
  "arquivos_processados": 2,
  "total_duvidas": 3,
  "confirmacoes_recebidas": 0
}
```

---

## 🔧 Próximos Passos para Implementação

### ✅ Fase 1: Copiar Arquivos (5 min)
1. Copiar 4 módulos .js para VPS
2. Copiar upload.html para public/
3. Instalar dependências: `npm install multer express-fileupload cors uuid`

### ✅ Fase 2: Integrar no server.js (15 min)
1. Adicionar imports dos módulos
2. Configurar multer storage
3. Adicionar 4 novos endpoints
4. Testar com PM2

### ✅ Fase 3: Testar Sistema (20 min)
1. Enviar arquivo PDF/XLS
2. Verificar extração
3. Responder dúvidas
4. Confirmar mudanças
5. Verificar dados atualizado

### ✅ Fase 4: Documentação (10 min)
1. Adicionar link upload.html ao dashboard principal
2. Criar guia para usuários
3. Testar fluxo completo

---

## ⚠️ Dependências Opcionais

Para funcionalidade completa, recomenda-se instalar:

```bash
# OCR para imagens (screenshots com valores)
npm install tesseract.js

# Parsing completo de PDF
npm install pdf2json

# Parser robusto de Excel
npm install xlsx

# Validação de email/telefone
npm install validator
```

**Sem essas dependências**: Sistema funciona com dados estruturados (Excel bem formatado, imagens simples) e retorna avisos pedindo confirmação manual.

---

## 🔒 Segurança Implementada

✅ **Validação de arquivos**
- Apenas extensões permitidas (.pdf, .xlsx, .xls, .png, .jpg, .jpeg, .gif)
- Limite de tamanho: 50MB por arquivo
- Limite de quantidade: 10 arquivos por requisição

✅ **Proteção de dados**
- Nenhuma alteração sem confirmação explícita do usuário
- Backup automático antes de aplicar mudanças
- Session IDs únicos (timestamp + random)
- Limpeza de arquivos temporários após processamento

✅ **Auditoria**
- Cada sessão armazena histórico completo
- Data/hora de cada ação
- Respostas do usuário registradas
- Mudanças aplicadas rastreáveis

---

## 📊 Dados Suportados

### Do arquivo → Para DEFAULT_DATA

**Cartões de Crédito**:
- Black → dividas.cartao_black
- Azul → Não mapeado (criar novo)
- Infinite → Não mapeado (criar novo)
- Amazon → dividas.bradesco_amazon

**Extratos Bancários**:
- Itaú → contas.conta_principal
- Bradesco → Criar novo
- Caixa → Criar novo

**Despesas**:
- Categoria → despesas.fixas.[categoria].itens
- Valores → Atualiza totais

**Receitas**:
- PIX, Transferência → receitas.outros_pix
- Salário → receitas.salario_juliane (verificar)

---

## 💾 Exemplo de Mudança Aplicada

**Antes**:
```json
{
  "dividas": { "total": 109838 },
  "despesas": { "total_mensal": 10974 },
  "receitas": { "total_mensal": 5750 },
  "analise": { "deficit_mensal": -5224 }
}
```

**Após enviar e confirmar dados**:
```json
{
  "dividas": { "total": 109838 },
  "despesas": { 
    "total_mensal": 11074,  // +R$100
    "fixas": {
      "outros": {
        "total": 760,       // +R$100
        "itens": [
          { "nome": "Novo item", "valor": 100, "categoria": "servicos" }
        ]
      }
    }
  },
  "receitas": { "total_mensal": 6250 },  // +R$500 PIX
  "analise": { "deficit_mensal": -4874 } // Melhorou R$350
}
```

---

## 🎓 Como Usar (Perspectiva do Usuário)

1. **Acesse** http://financeiro.descontoirresistivel.com.br/upload
2. **Arraste** seus arquivos (PDF, XLS, imagens)
3. **Clique** "Enviar Arquivos"
4. **Responda** as perguntas sobre itens desconhecidos
5. **Confirme** as mudanças propostas
6. **Pronto!** Dashboard atualizado automaticamente

---

## 📞 Suporte e Troubleshooting

### Problema: "Arquivo não foi processado"
**Solução**: Verificar tamanho (max 50MB) e formato (PDF, XLS, PNG, JPG)

### Problema: "OCR não funcionando em imagens"
**Solução**: Instalar tesseract.js: `npm install tesseract.js`

### Problema: "Excel não está sendo lido"
**Solução**: Verificar se as colunas têm headers, instalar xlsx: `npm install xlsx`

### Problema: "Sessão expirada"
**Solução**: Implementar Redis para persistência de sessões

---

## 🚀 Status de Implementação

| Componente | Status | Notas |
|-----------|--------|-------|
| file-parser.js | ✅ Pronto | Suporta básico; ocRa opcional |
| data-classifier.js | ✅ Pronto | 9 categorias + 5 cartões |
| duvidas-generator.js | ✅ Pronto | 6 tipos de perguntas |
| upload-handler.js | ✅ Pronto | Sessões em memória |
| upload.html | ✅ Pronto | UI completa + responsiva |
| Integração server.js | ⏳ Próximo | Código pronto no INTEGRACAO_UPLOAD_ENDPOINT.md |
| Testes de integração | ⏳ Próximo | Manual na VPS |
| Produção | ⏳ Próximo | Após testes |

---

## 📝 Notas Finais

- Sistema implementa **100% do protocolo** de 5 etapas
- **Sem quebra de compatibilidade** com sistema atual
- **Suporta dados parciais** (deep merge preserva dados antigos)
- **Rastreável** (session IDs + histórico)
- **Seguro** (confirmação antes de aplicar)
- **Escalável** (pronto para Redis se necessário)

**Pronto para ir para a VPS quando você quiser! 🚀**
