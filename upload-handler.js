/**
 * UPLOAD HANDLER MODULE
 * Manages file uploads and coordinates extraction/classification workflow
 * Implements PROTOCOLO_ATUALIZACAO_DADOS.md stages 2-3
 */

const fs = require('fs');
const path = require('path');
const fileParser = require('./file-parser');
const dataClassifier = require('./data-classifier');
const duvidasGenerator = require('./duvidas-generator');

// Session storage for ongoing uploads
const sessoes = {};

// Generate session ID
function gerarSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main upload handler
async function handleUpload(files, sessionIdOpt = null) {
  const sessionId = sessionIdOpt || gerarSessionId();
  const uploadDir = path.join(__dirname, 'uploads', sessionId);

  // Create upload directory
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const resultados = {
    sessionId,
    dataUpload: new Date().toISOString(),
    arquivos_processados: [],
    erros: [],
    resumo: {
      total_arquivos: files.length,
      sucesso: 0,
      erro: 0
    }
  };

  // Process each file
  for (const file of files) {
    try {
      // Save temporary file
      const nomeTemp = path.join(uploadDir, file.originalname || file.filename);

      if (!fs.existsSync(nomeTemp)) {
        // File needs to be saved
        if (file.path) {
          fs.copyFileSync(file.path, nomeTemp);
        }
      }

      // Parse file
      const dadosParsados = await fileParser.parseFile(nomeTemp);

      // Classify extracted data
      const processado = dataClassifier.procesarResultadoExtraction(dadosParsados);

      // Generate dúvidas if needed
      const duvidas = gerarDuvidasDoProcessado(processado);

      const resultado = {
        arquivo: file.originalname || file.filename,
        tipo: processado.tipo,
        total_itens: processado.total_itens,
        total_duvidas: duvidas.length,
        lancamentos_identificados: processado.lancamentos_identificados,
        duvidas: duvidas,
        status: duvidas.length > 0 ? 'requer_confirmacao' : 'pronto_aplicar'
      };

      resultados.arquivos_processados.push(resultado);
      resultados.resumo.sucesso++;

    } catch (error) {
      resultados.erros.push({
        arquivo: file.originalname || file.filename,
        erro: error.message
      });
      resultados.resumo.erro++;
    }
  }

  // Store session
  sessoes[sessionId] = {
    resultados,
    arquivos_originais: files.map(f => f.originalname || f.filename),
    caminho_upload: uploadDir,
    etapa_atual: 'confirmacao_duvidas', // ETAPA 3 do protocolo
    criado_em: new Date().toISOString(),
    confirmacoes_usuario: {},
    mudancas_propostas: null
  };

  return {
    status: 'extracao_completa',
    sessionId,
    ...resultados
  };
}

// Helper: Generate dúvidas from processado
function gerarDuvidasDoProcessado(processado) {
  const duvidas = [];

  // Se tem lançamentos ambíguos
  for (const lanc of processado.lancamentos_identificados || []) {
    if (lanc.requer_review) {
      // Gerar perguntas baseado no tipo de lançamento
      if (lanc.tipo_arquivo === 'extrato_bancario' || lanc.tipo_arquivo === 'fatura_cartao') {
        // Estes requerem classificação manual
        if (!lanc.banco && !lanc.cartao) {
          for (const valor of (lanc.valores_identificados || [])) {
            duvidas.push(
              duvidasGenerator.gerarPerguntaTipo('Lançamento extraído', valor),
              duvidasGenerator.gerarPerguntaCategoria('Lançamento extraído', valor)
            );
          }
        }
      }
    }
  }

  // Adicionar dúvidas do resultado
  duvidas.push(...(processado.duvidas || []));

  // Remover duplicatas
  const duvidaUnicas = {};
  for (const d of duvidas) {
    const key = `${d.tipo}_${d.item}`;
    if (!duvidaUnicas[key]) {
      duvidaUnicas[key] = d;
    }
  }

  return Object.values(duvidaUnicas);
}

// Get session status
function obterSessao(sessionId) {
  return sessoes[sessionId] || null;
}

// Process user responses (ETAPA 3: Confirmação de dúvidas)
function processarConfirmacoes(sessionId, confirmacoes) {
  const sessao = sessoes[sessionId];
  if (!sessao) {
    return { erro: 'Sessão não encontrada', statusCode: 404 };
  }

  // Armazenar confirmações
  sessao.confirmacoes_usuario = confirmacoes;

  // Processar e preparar mudanças (ETAPA 4)
  const mudancas = gerarMudancasPropostas(sessao);
  sessao.mudancas_propostas = mudancas;
  sessao.etapa_atual = 'confirmacao_mudancas'; // Próxima etapa

  return {
    status: 'confirmacoes_recebidas',
    sessionId,
    mudancas_propostas: mudancas,
    etapa_proxima: 'confirmacao_mudancas'
  };
}

// Generate proposed changes based on confirmations (ETAPA 4)
function gerarMudancasPropostas(sessao) {
  const mudancas = {
    dividas: [],
    despesas: [],
    receitas: [],
    contas: [],
    impactos: {
      deficit_anterior: 0,
      deficit_novo: 0,
      saldo_anterior: 0,
      saldo_novo: 0
    }
  };

  // Analisar confirmações e mapear para DEFAULT_DATA
  for (const [chave, confirmacao] of Object.entries(sessao.confirmacoes_usuario || {})) {
    // Parse confirmation and map to financial structure
    if (confirmacao.tipo_duvida === 'confirmacao_tipo') {
      if (confirmacao.resposta_usuario === 'entrada') {
        mudancas.receitas.push({
          tipo: 'nova_entrada',
          descricao: confirmacao.item,
          valor: confirmacao.valor,
          confirmado: true
        });
      } else if (confirmacao.resposta_usuario === 'saida_fixa') {
        mudancas.despesas.push({
          tipo: 'saida_fixa',
          descricao: confirmacao.item,
          valor: confirmacao.valor,
          categoria: 'outros'
        });
      } else if (confirmacao.resposta_usuario === 'saida_variavel') {
        mudancas.despesas.push({
          tipo: 'saida_variavel',
          descricao: confirmacao.item,
          valor: confirmacao.valor,
          categoria: 'outros'
        });
      }
    }
  }

  return mudancas;
}

// Format response for user (ETAPA 3 - Confirmação de dúvidas)
function formatarRespostaExtracaoParaUsuario(sessionId) {
  const sessao = obterSessao(sessionId);
  if (!sessao) {
    return '❌ Sessão não encontrada';
  }

  const resultado = sessao.resultados;
  let resposta = `✅ EXTRAÇÃO COMPLETA\n\n`;

  resposta += `📊 Resumo:\n`;
  resposta += `- Arquivos processados: ${resultado.resumo.sucesso}\n`;
  resposta += `- Total de itens identificados: ${resultado.arquivos_processados.reduce((sum, a) => sum + a.total_itens, 0)}\n`;
  resposta += `- Itens com dúvida: ${resultado.arquivos_processados.reduce((sum, a) => sum + a.total_duvidas, 0)}\n\n`;

  const totalDuvidas = resultado.arquivos_processados.reduce((sum, a) => sum + a.total_duvidas, 0);

  if (totalDuvidas === 0) {
    resposta += `🎉 Nenhuma dúvida! Pronto para aplicar as mudanças.\n`;
    resposta += `\nComando próximo: Confirme que deseja aplicar (SIM/NÃO)\n`;
    return resposta;
  }

  resposta += `⚠️  DÚVIDAS ENCONTRADAS:\n\n`;

  let contador = 1;
  for (const arquivo of resultado.arquivos_processados) {
    if (arquivo.duvidas.length > 0) {
      resposta += `📄 Arquivo: ${arquivo.arquivo}\n`;
      for (const duvida of arquivo.duvidas) {
        resposta += `\n${contador}. ${duvida.pergunta}\n`;
        if (duvida.opcoes) {
          duvida.opcoes.forEach((op, idx) => {
            resposta += `   ${String.fromCharCode(97 + idx)}) ${op.label}\n`;
          });
        }
        contador++;
      }
      resposta += `\n`;
    }
  }

  resposta += `\nPor favor, responda cada dúvida.\n`;
  resposta += `Exemplo: "1.a, 2.b, 3.c" ou detalhe cada uma.\n`;

  return resposta;
}

// Format proposed changes for user (ETAPA 4)
function formatarMudancasPropostasParaUsuario(sessionId) {
  const sessao = obterSessao(sessionId);
  if (!sessao || !sessao.mudancas_propostas) {
    return '❌ Mudanças não encontradas';
  }

  let resposta = `📋 MUDANÇAS PROPOSTAS:\n\n`;

  const mudancas = sessao.mudancas_propostas;

  if (mudancas.receitas && mudancas.receitas.length > 0) {
    resposta += `📈 RECEITAS:\n`;
    for (const rec of mudancas.receitas) {
      resposta += `+ ${rec.descricao}: R$ ${rec.valor.toFixed(2)}\n`;
    }
    resposta += `\n`;
  }

  if (mudancas.despesas && mudancas.despesas.length > 0) {
    resposta += `📉 DESPESAS:\n`;
    for (const desp of mudancas.despesas) {
      resposta += `+ ${desp.descricao}: R$ ${desp.valor.toFixed(2)} (${desp.tipo})\n`;
    }
    resposta += `\n`;
  }

  resposta += `💾 Autoriza aplicar essas mudanças? [SIM/NÃO]\n`;

  return resposta;
}

// Apply confirmed changes (ETAPA 5)
function aplicarMudancas(sessionId, confirmacao, DEFAULT_DATA) {
  const sessao = obterSessao(sessionId);
  if (!sessao) {
    return { erro: 'Sessão não encontrada', statusCode: 404 };
  }

  if (confirmacao !== 'SIM' && confirmacao !== 'Sim' && confirmacao !== true) {
    return {
      status: 'mudancas_canceladas',
      mensagem: 'Operação cancelada pelo usuário'
    };
  }

  // Aplicar mudanças ao DEFAULT_DATA
  const dadosAtualizados = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const mudancas = sessao.mudancas_propostas;

  // Atualizar receitas
  for (const rec of mudancas.receitas || []) {
    dadosAtualizados.receitas.outros_pix.valor_medio += rec.valor;
  }

  // Atualizar despesas
  for (const desp of mudancas.despesas || []) {
    dadosAtualizados.despesas.total_mensal += desp.valor;
    if (desp.tipo === 'saida_fixa') {
      dadosAtualizados.despesas.fixas.outros.total += desp.valor;
      dadosAtualizados.despesas.fixas.outros.itens.push({
        nome: desp.descricao,
        valor: desp.valor,
        categoria: desp.categoria
      });
    }
  }

  // Atualizar análise
  dadosAtualizados.analise.deficit_mensal = dadosAtualizados.receitas.total_mensal - dadosAtualizados.despesas.total_mensal;
  dadosAtualizados.metadata.data_atualizacao = new Date().toISOString().split('T')[0];

  sessao.etapa_atual = 'mudancas_aplicadas';
  sessao.dados_atualizados = dadosAtualizados;

  return {
    status: 'mudancas_aplicadas',
    sessionId,
    dados_atualizados: dadosAtualizados,
    mensagem: '✅ Mudanças aplicadas com sucesso!',
    proximo_passo: 'Download do arquivo atualizado'
  };
}

module.exports = {
  handleUpload,
  obterSessao,
  processarConfirmacoes,
  gerarMudancasPropostas,
  formatarRespostaExtracaoParaUsuario,
  formatarMudancasPropostasParaUsuario,
  aplicarMudancas,
  gerarSessionId
};
