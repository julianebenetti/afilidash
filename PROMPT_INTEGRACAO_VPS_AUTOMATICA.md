# 🤖 PROMPT AUTOMÁTICO: Integração Upload System na VPS

**Para**: Claude (ou qualquer agente) executar a integração **SEM intervenção humana**

---

## 📋 INSTRUÇÕES PARA EXECUÇÃO AUTOMÁTICA

Este prompt deve ser usado quando você (ou outro Claude) precisar integrar o sistema de upload automático na VPS `financeiro.descontoirresistivel.com.br` de forma **totalmente automática**.

### **Pré-requisitos**
- ✅ SSH acesso à VPS (credenciais configuradas)
- ✅ Repositório clonado em `/home/benetti/MGD-Benetti/`
- ✅ Node.js + npm + PM2 já instalados

### **Tempo Estimado**: 25-30 minutos

---

## 🚀 PROMPT PARA EXECUÇÃO AUTOMÁTICA

```
TAREFA: Integrar sistema de upload automático na VPS

CONTEXTO:
- Branch atual: claude/deploy-financeiro-vps-o6isl9
- Arquivos prontos: file-parser.js, data-classifier.js, duvidas-generator.js, upload-handler.js, public/upload.html
- VPS: 89.117.60.XX (Hostinger)
- Usuário: root
- Diretório projeto: /home/benetti/MGD-Benetti/
- Servidor: Node.js Express + PM2

TAREFA EXECUTAR:

FASE 1: PREPARAÇÃO
================================
1. Conectar via SSH à VPS
2. Navegar para /home/benetti/MGD-Benetti/
3. Verificar que os seguintes arquivos EXISTEM:
   - server.js
   - package.json
   - public/index.html
4. Fazer backup do server.js.original: cp server.js server.js.backup-$(date +%s)

FASE 2: COPIAR ARQUIVOS DO REPOSITÓRIO
================================
5. Copiar 4 módulos de backend para VPS:
   - Copiar file-parser.js
   - Copiar data-classifier.js
   - Copiar duvidas-generator.js
   - Copiar upload-handler.js
   - Para: /home/benetti/MGD-Benetti/

6. Copiar arquivo frontend:
   - Copiar public/upload.html
   - Para: /home/benetti/MGD-Benetti/public/

7. Verificar que os 5 arquivos foram copiados:
   ls -la *.js public/upload.html

FASE 3: INSTALAR DEPENDÊNCIAS
================================
8. Instalar pacotes NPM necessários:
   npm install multer express-fileupload cors uuid

9. (Opcional) Instalar dependências para OCR completo:
   npm install tesseract.js pdf2json xlsx
   
10. Verificar instalação:
    npm list multer cors uuid

FASE 4: EDITAR server.js
================================
11. ADICIONAR IMPORTS (após linhas de require existentes, ~linha 25):

    Adicionar EXATAMENTE este código:
    
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

12. ADICIONAR ENDPOINTS (antes do app.listen, ~linha 400):

    Adicionar EXATAMENTE este código:
    
    ```javascript
    // ===== FILE UPLOAD ENDPOINTS =====
    
    app.post('/api/upload', upload.array('files', 10), async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
        }
        console.log(`[UPLOAD] ${req.files.length} arquivo(s) recebido(s)`);
        const resultado = await uploadHandler.handleUpload(req.files);
        const respostaFormatada = uploadHandler.formatarRespostaExtracaoParaUsuario(resultado.sessionId);
        res.json({
          status: 'sucesso',
          sessionId: resultado.sessionId,
          resumo: resultado.resumo,
          resposta_usuario: respostaFormatada,
          arquivos_processados: resultado.arquivos_processados,
          total_duvidas: resultado.arquivos_processados.reduce((sum, a) => sum + a.total_duvidas, 0)
        });
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
    
    app.post('/api/upload/confirmacoes', express.json(), (req, res) => {
      try {
        const { sessionId, confirmacoes } = req.body;
        if (!sessionId) {
          return res.status(400).json({ erro: 'sessionId é obrigatório' });
        }
        const resultado = uploadHandler.processarConfirmacoes(sessionId, confirmacoes);
        if (resultado.erro) {
          return res.status(resultado.statusCode || 400).json(resultado);
        }
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
    
    app.post('/api/upload/aplicar', express.json(), (req, res) => {
      try {
        const { sessionId, confirmacao } = req.body;
        if (!sessionId) {
          return res.status(400).json({ erro: 'sessionId é obrigatório' });
        }
        const resultado = uploadHandler.aplicarMudancas(sessionId, confirmacao, DEFAULT_DATA);
        if (resultado.erro) {
          return res.status(resultado.statusCode || 400).json(resultado);
        }
        if (resultado.dados_atualizados) {
          const dadosPath = path.join(__dirname, 'dados.json');
          fs.writeFileSync(dadosPath, JSON.stringify(resultado.dados_atualizados, null, 2));
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

FASE 5: VALIDAÇÃO DO server.js
================================
13. Verificar se server.js tem erros de sintaxe:
    node -c server.js

14. Se houver erro, LOG E RESTAURAR:
    cp server.js.backup-* server.js
    PARAR E INFORMAR ERRO

FASE 6: REINICIAR SERVIDOR
================================
15. Parar servidor atual:
    pm2 stop server

16. Limpar process antigo:
    pm2 delete server

17. Iniciar novo servidor:
    pm2 start server.js --name server

18. Verificar se iniciou corretamente:
    pm2 status

19. Ver logs (aguardar 5 segundos):
    sleep 5
    pm2 logs server --lines 20

FASE 7: TESTES DE CONNECTIVIDADE
================================
20. Testar API existente (/api/dados):
    curl http://localhost:3001/api/dados
    VERIFICAR: Deve retornar JSON com dados financeiros

21. Testar upload endpoint criado:
    curl -X POST http://localhost:3001/api/upload
    VERIFICAR: Deve retornar erro 400 (sem arquivo)
    Resposta esperada: {"erro": "Nenhum arquivo foi enviado"}

22. Testar se upload.html foi copiado:
    curl http://localhost:3001/upload
    VERIFICAR: Deve retornar HTML (status 200)

FASE 8: TESTE COMPLETO (OPCIONAL)
================================
23. (Se houver arquivo de teste disponível) Fazer upload real:
    curl -F "files=@test.pdf" http://localhost:3001/api/upload
    VERIFICAR: Deve retornar sessionId + resposta_usuario

FASE 9: LIMPEZA E CONFIRMAÇÃO
================================
24. Criar diretórios necessários se não existem:
    mkdir -p uploads backups

25. Definir permissões:
    chmod 755 uploads backups

26. Verificar estrutura final:
    ls -la
    ls -la public/
    ls -la uploads/
    ls -la backups/

27. Fazer commit no Git (OPCIONAL):
    git add -A
    git commit -m "Deploy: Upload system integrated to VPS"
    git push origin claude/deploy-financeiro-vps-o6isl9

CONCLUSÃO
================================
28. Listar status final:
    pm2 status
    pm2 logs server --lines 5

29. RELATÓRIO FINAL:
    ✅ Se tudo funcionou:
    - [X] Arquivos copiados
    - [X] Dependências instaladas
    - [X] server.js modificado
    - [X] Servidor reiniciado
    - [X] API testada
    - [X] Upload endpoint ativo
    - [X] Upload.html acessível
    
    ❌ Se algo quebrou:
    - Informar qual etapa falhou
    - Mostrar erro completo
    - Restaurar backup: cp server.js.backup-* server.js
    - Reiniciar: pm2 restart server

IMPORTANTE:
- NÃO prosseguir se erro em alguma fase
- SEMPRE fazer backup antes de modificar server.js
- SEMPRE testar endpoints após modificar
- SEMPRE verificar logs se algo estranho
- EM CASO DE ERRO, RESTAURAR BACKUP IMEDIATAMENTE
```

---

## 🔧 COMO USAR ESTE PROMPT

### **Opção 1: Claude na VPS (Recomendado)**
```bash
# Você coloca este arquivo em um local acessível
# Depois passa o prompt para o Claude:

"Execute o PROMPT_INTEGRACAO_VPS_AUTOMATICA.md no servidor 89.117.60.XX"
```

### **Opção 2: Como CLAUDE.md**
Pode renomear para `.claude/CLAUDE.md` para o Claude usar automaticamente:
```
cp PROMPT_INTEGRACAO_VPS_AUTOMATICA.md .claude/CLAUDE.md
```

### **Opção 3: Executar Agora (Interativo)**
Passar o conteúdo para o Claude junto com acesso SSH:
```
"Integrate upload system following: [conteúdo do prompt]"
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após integração, o Claude deve confirmar:

- [ ] 5 arquivos copiados (4 .js + upload.html)
- [ ] Dependências npm instaladas (multer, cors, uuid)
- [ ] server.js modificado com imports + 4 endpoints
- [ ] server.js valida sem erros (node -c)
- [ ] PM2 reiniciado com sucesso
- [ ] GET /api/dados retorna dados financeiros
- [ ] POST /api/upload retorna 400 (erro sem arquivo)
- [ ] GET /upload retorna HTML (status 200)
- [ ] Backup criado: server.js.backup-[timestamp]
- [ ] Diretórios criados: uploads/, backups/
- [ ] Logs mostram "server running on port 3001"

---

## 🚨 TROUBLESHOOTING AUTOMÁTICO

Se o Claude encontrar problemas:

**Problema**: `Cannot find module 'multer'`
**Solução**: `npm install multer express-fileupload cors uuid`

**Problema**: `Port 3001 already in use`
**Solução**: `lsof -i :3001` → `kill -9 <PID>` → `pm2 restart server`

**Problema**: `SyntaxError in server.js`
**Solução**: `cp server.js.backup-* server.js` (restaurar backup)

**Problema**: `Cannot read property 'handleUpload'`
**Solução**: Verificar que `upload-handler.js` foi copiado corretamente

**Problema**: `ENOENT: no such file or directory, open 'dados.json'`
**Solução**: `mkdir -p backups` && criar arquivo vazio se necessário

---

## 📞 INFORMAÇÕES FINAIS

**Depois de completo**:
- ✅ Dashboard continua funcionando: https://financeiro.descontoirresistivel.com.br
- ✅ Upload disponível em: https://financeiro.descontoirresistivel.com.br/upload
- ✅ API pronta para receber arquivos
- ✅ Backup automático para cada mudança
- ✅ Sem intervenção manual necessária

**Próximos passos**:
1. Acessar interface de upload
2. Enviar primeiro arquivo
3. Confirmar fluxo completo
4. Documentar guia para usuários

---

**Criado para**: Integração automática da VPS
**Versão**: 1.0
**Status**: Pronto para execução

🤖 **Pronto para ser executado por um Claude autônomo!**
