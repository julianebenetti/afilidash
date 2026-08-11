/**
 * DATA CLASSIFIER MODULE
 * Classifies extracted financial data and maps to DEFAULT_DATA structure
 */

const CARTAO_PATTERNS = {
  black: ['black', 'mastercard', '4846'],
  azul: ['azul', 'azul', '5142'],
  infinite: ['infinite', 'infinit'],
  amazon: ['amazon', 'bradesco']
};

const BANCO_PATTERNS = {
  itau: ['itaú', 'itau', 'itau unibanco'],
  bradesco: ['bradesco'],
  caixa: ['caixa', 'cef'],
  banco_do_brasil: ['banco do brasil', 'bb']
};

const CATEGORIA_PATTERNS = {
  transporte: ['uber', 'táxi', 'ônibus', 'combustível', 'gasolina', 'estacionamento', 'hub do', '99'],
  supermercado: ['carrefour', 'extra', 'pão de açúcar', 'supermercado', 'hortifruti'],
  educacao: ['escola', 'curso', 'educação', 'aula', 'matrícula'],
  casa: ['condomínio', 'aluguel', 'cpfl', 'sanasa', 'água', 'energia', 'internet', 'claro'],
  pessoal: ['roupas', 'beleza', 'salão', 'cabelo', 'farmácia'],
  negocio: ['ads', 'publicidade', 'material', 'equipamento', 'das', 'mei'],
  servicos: ['faxina', 'limpeza', 'encanador', 'eletricista', 'mecânico'],
  diversao: ['cinema', 'restaurante', 'bar', 'café', 'pizza']
};

// Identificar tipo de lançamento
function identificarTipo(descricao) {
  const desc = descricao.toLowerCase();

  // Receita
  if (desc.includes('pix recebido') || desc.includes('depósito') || desc.includes('salário') || desc.includes('transferência recebida')) {
    return 'entrada';
  }

  // Saída (verificar se é fixa ou variável)
  if (desc.includes('assinatura') || desc.includes('mensalidad') || desc.includes('fixo')) {
    return 'saida_fixa';
  }

  // Padrão: saída variável
  return 'saida_variavel';
}

// Classificar descrição para categoria
function classificarCategoria(descricao) {
  const desc = descricao.toLowerCase();

  for (const [categoria, palavras] of Object.entries(CATEGORIA_PATTERNS)) {
    for (const palavra of palavras) {
      if (desc.includes(palavra)) {
        return categoria;
      }
    }
  }

  return 'outros';
}

// Identificar cartão por descrição ou arquivo
function identificarCartao(descricao, nomeArquivo = '') {
  const texto = (descricao + ' ' + nomeArquivo).toLowerCase();

  for (const [cartao, patterns] of Object.entries(CARTAO_PATTERNS)) {
    for (const pattern of patterns) {
      if (texto.includes(pattern)) {
        return cartao;
      }
    }
  }

  return null;
}

// Identificar banco
function identificarBanco(descricao, nomeArquivo = '') {
  const texto = (descricao + ' ' + nomeArquivo).toLowerCase();

  for (const [banco, patterns] of Object.entries(BANCO_PATTERNS)) {
    for (const pattern of patterns) {
      if (texto.includes(pattern)) {
        return banco;
      }
    }
  }

  return null;
}

// Extrair valores em real
function extrairValores(texto) {
  // Padrões: R$ 1.234,56 ou R$1234,56 ou R$ 1234.56
  const regex = /R\$\s*[\d.,]+/gi;
  const matches = texto.match(regex) || [];

  return matches.map(match => {
    let valor = match.replace('R$', '').trim();
    // Converter para número
    valor = parseFloat(valor.replace('.', '').replace(',', '.'));
    return valor;
  }).filter(v => !isNaN(v));
}

// Classificar lançamento extraído
function classificarLancamento(descricao, valor = 0, dataOuMes = null) {
  return {
    descricao,
    valor,
    tipo: identificarTipo(descricao),
    categoria: classificarCategoria(descricao),
    data: dataOuMes,
    confianca: 'media',
    requer_confirmacao: valor === 0 || !descricao || descricao.length < 3
  };
}

// Processar resultado de parsing
function procesarResultadoExtraction(resultadoParsing) {
  const duvidas = [];
  const lancamentos = [];

  // Se é extrato bancário
  if (resultadoParsing.tipo === 'extrato_bancario') {
    const banco = identificarBanco(resultadoParsing.conteudo_bruto || '', resultadoParsing.arquivo_original);
    const valores = extrairValores(resultadoParsing.conteudo_bruto || '');

    lancamentos.push({
      tipo_arquivo: 'extrato_bancario',
      banco,
      valores_identificados: valores,
      quantidade: valores.length,
      requer_review: true
    });
  }

  // Se é fatura de cartão
  if (resultadoParsing.tipo === 'fatura_cartao') {
    const cartao = identificarCartao(resultadoParsing.conteudo_bruto || '', resultadoParsing.arquivo_original);
    const valores = extrairValores(resultadoParsing.conteudo_bruto || '');

    lancamentos.push({
      tipo_arquivo: 'fatura_cartao',
      cartao,
      valores_identificados: valores,
      total_estimado: valores.reduce((a, b) => a + b, 0),
      quantidade: valores.length,
      requer_review: true
    });
  }

  // Se é planilha
  if (resultadoParsing.tipo === 'planilha_excel') {
    for (const [nomeSheet, dados] of Object.entries(resultadoParsing.dados || {})) {
      if (Array.isArray(dados)) {
        for (const linha of dados) {
          // Procurar por colunas com valores
          for (const [coluna, valor] of Object.entries(linha)) {
            if (typeof valor === 'number' || (typeof valor === 'string' && /^[\d.,]+$/.test(valor))) {
              lancamentos.push({
                tipo_arquivo: 'planilha_excel',
                planilha: nomeSheet,
                descricao: coluna,
                valor,
                requer_review: true
              });
            }
          }
        }
      }
    }
  }

  // Se é screenshot com OCR
  if (resultadoParsing.tipo === 'screenshot_ocr') {
    const valores = resultadoParsing.valores_identificados || [];

    for (let i = 0; i < valores.length; i++) {
      const valor = parseFloat(valores[i].replace('R$', '').replace('.', '').replace(',', '.'));
      if (!isNaN(valor)) {
        duvidas.push({
          tipo_duvida: 'valor_identificado',
          valor: valor,
          confianca_ocr: resultadoParsing.confianca,
          indice: i,
          requer_confirmacao_tipo: true,
          requer_confirmacao_categoria: true
        });
      }
    }
  }

  return {
    arquivo: resultadoParsing.arquivo_original,
    tipo: resultadoParsing.tipo,
    lancamentos_identificados: lancamentos,
    duvidas: duvidas,
    total_itens: lancamentos.length + duvidas.length
  };
}

// Gerar lista de dúvidas consolidadas
function gerarDuvidas(processados) {
  const duvidasConsolidadas = [];

  for (const proc of processados) {
    // Adicionar dúvidas específicas do processamento
    duvidasConsolidadas.push(...proc.duvidas);

    // Marcar lançamentos ambíguos
    for (const lanc of proc.lancamentos_identificados) {
      if (lanc.requer_review && !lanc.cartao && !lanc.banco) {
        duvidasConsolidadas.push({
          tipo_duvida: 'lançamento_ambiguo',
          arquivo: proc.arquivo,
          lancamento: lanc,
          perguntas: [
            'É pessoal ou negócio?',
            'Qual é a categoria?',
            'É entrada ou saída?',
            'É fixo ou variável?'
          ]
        });
      }
    }
  }

  return duvidasConsolidadas;
}

module.exports = {
  identificarTipo,
  classificarCategoria,
  identificarCartao,
  identificarBanco,
  extrairValores,
  classificarLancamento,
  procesarResultadoExtraction,
  gerarDuvidas
};
