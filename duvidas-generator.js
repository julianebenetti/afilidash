/**
 * DÚVIDAS GENERATOR MODULE
 * Generates questions for ambiguous financial items
 * Follows PROTOCOLO_ATUALIZACAO_DADOS.md rules
 */

// Gerar pergunta estruturada para tipo desconhecido
function gerarPerguntaTipo(descricao, valor) {
  return {
    id: `tipo_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'confirmacao_tipo',
    item: descricao,
    valor: valor,
    pergunta: `"${descricao}" — R$ ${valor.toFixed(2)}`,
    opcoes: [
      { valor: 'entrada', label: 'Entrada (dinheiro que entra)' },
      { valor: 'saida_fixa', label: 'Saída Fixa (despesa mensal)' },
      { valor: 'saida_variavel', label: 'Saída Variável (gasto esporádico)' }
    ],
    obrigatorio: true
  };
}

// Gerar pergunta para categoria desconhecida
function gerarPerguntaCategoria(descricao, valor) {
  return {
    id: `categoria_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'confirmacao_categoria',
    item: descricao,
    valor: valor,
    pergunta: `Qual é a categoria de "${descricao}"?`,
    opcoes: [
      { valor: 'transporte', label: 'Transporte' },
      { valor: 'supermercado', label: 'Supermercado' },
      { valor: 'educacao', label: 'Educação' },
      { valor: 'casa', label: 'Casa/Condomínio' },
      { valor: 'pessoal', label: 'Pessoal' },
      { valor: 'negocio', label: 'Negócio' },
      { valor: 'servicos', label: 'Serviços' },
      { valor: 'diversao', label: 'Diversão/Lazer' },
      { valor: 'outros', label: 'Outro' }
    ],
    obrigatorio: true
  };
}

// Gerar pergunta para identificar cartão
function gerarPerguntaCartao(descricao, valor) {
  return {
    id: `cartao_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'confirmacao_cartao',
    item: descricao,
    valor: valor,
    pergunta: `A qual cartão pertence "${descricao}"?`,
    opcoes: [
      { valor: 'black', label: 'Mastercard Black' },
      { valor: 'azul', label: 'Cartão Azul' },
      { valor: 'infinite', label: 'Infinite' },
      { valor: 'amazon', label: 'Bradesco Amazon' },
      { valor: 'outro', label: 'Outro cartão' }
    ],
    obrigatorio: false
  };
}

// Gerar pergunta para identificar se é pessoal ou negócio
function gerarPerguntaEsfera(descricao, valor) {
  return {
    id: `esfera_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'confirmacao_esfera',
    item: descricao,
    valor: valor,
    pergunta: `"${descricao}" é pessoal ou negócio?`,
    opcoes: [
      { valor: 'pessoal', label: 'Pessoal (Juliane/Hugo)' },
      { valor: 'negocio', label: 'Negócio (DI)' }
    ],
    obrigatorio: true
  };
}

// Gerar pergunta para confirmação simples
function gerarPerguntaConfirmacao(descricao, valor, contexto = '') {
  return {
    id: `confirmacao_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'confirmacao_simples',
    item: descricao,
    valor: valor,
    pergunta: contexto ? `${contexto} - "${descricao}" R$ ${valor.toFixed(2)}?` : `Confirma "${descricao}" R$ ${valor.toFixed(2)}?`,
    opcoes: [
      { valor: true, label: 'Sim, confirmo' },
      { valor: false, label: 'Não, ignorar' }
    ],
    obrigatorio: true
  };
}

// Gerar pergunta para dados conflitantes
function gerarPerguntaConflito(descricao, valorAnterior, valorNovo) {
  return {
    id: `conflito_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'resolucao_conflito',
    item: descricao,
    pergunta: `"${descricao}" tem valores diferentes. Qual usar?`,
    opcoes: [
      { valor: 'anterior', label: `Manter anterior: R$ ${valorAnterior.toFixed(2)}` },
      { valor: 'novo', label: `Usar novo: R$ ${valorNovo.toFixed(2)}` },
      { valor: 'somar', label: `Somar: R$ ${(valorAnterior + valorNovo).toFixed(2)}` }
    ],
    obrigatorio: true,
    contexto: {
      anterior: valorAnterior,
      novo: valorNovo
    }
  };
}

// Agrupar dúvidas por tipo
function agruparDuvidas(duvidas) {
  const agrupadas = {
    tipo: [],
    categoria: [],
    cartao: [],
    esfera: [],
    conflito: [],
    confirmacao: [],
    outras: []
  };

  for (const duvida of duvidas) {
    const tipo = duvida.tipo || 'outras';
    if (agrupadas[tipo]) {
      agrupadas[tipo].push(duvida);
    } else {
      agrupadas[tipo].push(duvida);
      agrupadas.outras.push(duvida);
    }
  }

  return agrupadas;
}

// Gerar resposta estruturada para o usuário
function gerarRespostaDuvidas(nomeArquivo, duvidas, totalIdentificados) {
  const agrupadas = agruparDuvidas(duvidas);

  let resposta = `✅ EXTRAÇÃO COMPLETA\n\n`;
  resposta += `📊 Resumo:\n`;
  resposta += `- Arquivo: ${nomeArquivo}\n`;
  resposta += `- Itens identificados: ${totalIdentificados}\n`;
  resposta += `- Itens com dúvida: ${duvidas.length}\n\n`;

  if (duvidas.length === 0) {
    resposta += `🎉 Nenhuma dúvida! Todos os itens foram identificados com sucesso.\n`;
    return { status: 'sem_duvidas', resposta };
  }

  resposta += `⚠️  DÚVIDAS ENCONTRADAS:\n\n`;

  duvidas.forEach((duvida, index) => {
    resposta += `${index + 1}. ${duvida.pergunta}\n`;
    if (duvida.opcoes) {
      duvida.opcoes.forEach((op, idx) => {
        resposta += `   ${String.fromCharCode(97 + idx)}) ${op.label}\n`;
      });
    }
    resposta += `\n`;
  });

  resposta += `Por favor, responda cada dúvida no formato: "1.a, 2.b, 3.c" ou detalhe cada uma.\n`;

  return {
    status: 'com_duvidas',
    resposta,
    duvidas,
    agrupadas
  };
}

// Processar respostas do usuário
function procesarRespostas(duvidas, respostasUsuario) {
  const confirmadas = [];
  const rejeitadas = [];
  const erros = [];

  // respostasUsuario deve ser um objeto com ids ou índices mapeando respostas

  for (let i = 0; i < duvidas.length; i++) {
    const duvida = duvidas[i];
    const resposta = respostasUsuario[duvida.id] || respostasUsuario[i];

    if (!resposta) {
      erros.push({
        indice: i,
        duvida: duvida.pergunta,
        erro: 'Resposta não fornecida'
      });
      continue;
    }

    if (resposta === false || resposta.toLowerCase() === 'ignorar') {
      rejeitadas.push({
        indice: i,
        duvida: duvida.item,
        motivo: 'Rejeitado pelo usuário'
      });
      continue;
    }

    confirmadas.push({
      indice: i,
      duvida_id: duvida.id,
      tipo_duvida: duvida.tipo,
      item: duvida.item,
      valor: duvida.valor,
      resposta_usuario: resposta,
      confirmado_em: new Date().toISOString()
    });
  }

  return {
    confirmadas,
    rejeitadas,
    erros,
    total_confirmadas: confirmadas.length,
    total_rejeitadas: rejeitadas.length,
    total_erros: erros.length
  };
}

module.exports = {
  gerarPerguntaTipo,
  gerarPerguntaCategoria,
  gerarPerguntaCartao,
  gerarPerguntaEsfera,
  gerarPerguntaConfirmacao,
  gerarPerguntaConflito,
  agruparDuvidas,
  gerarRespostaDuvidas,
  procesarRespostas
};
