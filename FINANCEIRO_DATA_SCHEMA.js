/**
 * FINANCEIRO DASHBOARD — Complete Data Schema
 * ============================================
 * This file documents the COMPLETE data structure that the financial dashboard expects.
 *
 * Location: This MUST be used as DEFAULT_DATA in server.js on the VPS at:
 * /home/benetti/MGD-Benetti/server.js
 *
 * The backend should return this structure for GET /api/dados
 */

const DEFAULT_DATA = {
  // ═══════════════════════════════════════════════════
  // PESSOAS — People data (Juliane & Hugo)
  // ═══════════════════════════════════════════════════
  pessoa: {
    juliane: {
      nome: "Juliane Benetti",
      empresa: "Elektro Redes S.A.",
      cargo: "Analista",
      salarioLiquido: 3400,
      salarioAtual: 3105, // mai/26 — verificar holerite
      cidade: "Campinas",
      observacao: "Salário mai/26 veio menor — R$295 a menos que esperado"
    },
    hugo: {
      nome: "Hugo",
      profissao: "Taxista",
      rendaBruta: 3200, // R$800/semana meta
      combustivel: 850, // Custo operacional — sai do cartão da Juliane
      rendaLiquida: 2350, // Após combustível
      observacao: "Renda descontado combustível"
    }
  },

  // ═══════════════════════════════════════════════════
  // CONTAS — Bank accounts & balances
  // ═══════════════════════════════════════════════════
  contas: {
    saldo_total: 5587,
    data_saldo: "2026-06-08",
    conta_principal: {
      banco: "Itaú",
      tipo: "Corrente",
      saldo: 5587,
      observacao: "Conta onde entra salário + consignado C/C"
    }
  },

  // ═══════════════════════════════════════════════════
  // DÍVIDAS — Total debts organized by type
  // ═══════════════════════════════════════════════════
  dividas: {
    total: 109838,

    consignados_folha: {
      total: 52084,
      parcela_mensal: 1564,
      observacao: "Descontado direto na folha de pagamento",
      itens: [
        {
          nome: "Econsignado 1",
          data_contratacao: "dez/2025",
          saldo: 28152,
          parcela_mensal: 676,
          termina: "nov/2032",
          parcelas_restantes: 96
        },
        {
          nome: "Econsignado 2",
          data_contratacao: "nov/2025",
          saldo: 14762,
          parcela_mensal: 634,
          termina: "out/2028",
          parcelas_restantes: 36
        },
        {
          nome: "Econsignado 3",
          data_contratacao: "mar/2026",
          saldo: 9170,
          parcela_mensal: 254,
          termina: "fev/2033",
          parcelas_restantes: 84
        }
      ],
      alerta: "Margem consignável esgotada. Não é possível novo consignado."
    },

    consignado_cc: {
      nome: "Consignado Conta Corrente",
      banco: "Itaú",
      saldo: 28743,
      parcela_mensal: 1403,
      vencimento_dia: 1,
      termina: "jun/2028",
      parcelas_restantes: 28,
      parcelas_totais: 60,
      parcela_atual: 32,
      data_contratacao: "jul/2023",
      sugestao: "Use 13º + PLR (dez/26 ~R$8.725) para abater e liberar R$1.403/mês antes de 2028"
    },

    emprestimo_cenira: {
      nome: "Empréstimo Cenira",
      saldo: 23252,
      parcela_mensal: 646,
      primeira_parcela: "2026-06-25",
      termina: "jun/2029",
      parcelas_totais: 36,
      valor_recebido: 10000,
      juros_iof: 13252,
      custo: "alto",
      observacao: "Tomado para cobrir fatura do Black. Não tomar novos empréstimos.",
      alerta: "Custo muito alto"
    },

    cartao_black: {
      nome: "Mastercard Black",
      ultimos_4: "4846",
      fatura_atual: 5692,
      status: "pago integralmente",
      vencimento_fatura: "2026-05-26",
      alerta: "Nunca entrou no rotativo ✅"
    },

    bradesco_amazon: {
      nome: "Bradesco Amazon Platinum",
      saldo: 67,
      status: "praticamente zerado ✅",
      parcelas_pendentes: 2
    },

    mercado_pago: {
      nome: "Empréstimo Mercado Pago",
      valor_total: 14000,
      parcelas: 6,
      parcela_mensal: 1943,
      vencimento_dia: 16,
      data_contratacao: "mai/2026",
      primeira_parcela: "2026-06-16",
      ultima_parcela: "nov/2026",
      observacao: "Empréstimo para cobrir faturas do negócio"
    }
  },

  // ═══════════════════════════════════════════════════
  // DESPESAS — Monthly fixed expenses
  // ═══════════════════════════════════════════════════
  despesas: {
    total_mensal: 10974,

    fixas: {
      escola_educacao: {
        total: 2275,
        itens: [
          {
            nome: "Escola Valentina",
            valor: 1249,
            vencimento_dia: 11,
            referencia: "PAG TIT 199060387000"
          },
          {
            nome: "Escola Luca",
            valor: 546,
            vencimento_dia: 1,
            referencia: "PAG TIT 001"
          },
          {
            nome: "Van escolar Luca",
            valor: 480,
            vencimento_dia: 28,
            referencia: "PIX Guilherme"
          }
        ]
      },

      dividas: {
        total: 2049,
        itens: [
          {
            nome: "Consignado C/C",
            valor: 1403,
            vencimento_dia: 1
          },
          {
            nome: "Empréstimo Cenira",
            valor: 646,
            vencimento_dia: 25,
            inicio: "2026-06-25"
          }
        ]
      },

      casa: {
        total: 1238,
        itens: [
          {
            nome: "Condomínio",
            valor: 623,
            referencia: "PAG TIT 237"
          },
          {
            nome: "CPFL energia",
            valor: 146
          },
          {
            nome: "SANASA água",
            valor: 142
          },
          {
            nome: "Claro internet",
            valor: 145
          },
          {
            nome: "Celular",
            valor: 74
          },
          {
            nome: "IPTU parcelado",
            valor: 108
          }
        ]
      },

      outros: {
        total: 660,
        itens: [
          {
            nome: "APE Lockers (guarda móveis)",
            valor: 223,
            observacao: "R$2.676/ano — avaliar se vender móveis"
          },
          {
            nome: "DAS MEI (negócio)",
            valor: 87
          },
          {
            nome: "Edileia (vaga carro)",
            valor: 200
          },
          {
            nome: "Nilza (faxina)",
            valor: 150
          }
        ]
      },

      fatura_black_estimada: {
        total: 4753,
        parcelamentos: 2297,
        rotina: 2456,
        observacao: "Estimativa — parcelamentos em andamento"
      }
    }
  },

  // ═══════════════════════════════════════════════════
  // RECEITAS — Monthly income
  // ═══════════════════════════════════════════════════
  receitas: {
    total_mensal: 5750,

    salario_juliane: {
      bruto_referencia: 3400,
      atual: 3105,
      observacao: "mai/26 — R$295 menor que esperado",
      descontos: [
        { tipo: "INSS", descricao: "" },
        { tipo: "IR", descricao: "" },
        { tipo: "NEOS", descricao: "" },
        { tipo: "Saúde", descricao: "" },
        { tipo: "Econsignados", descricao: "R$1.564" }
      ]
    },

    hugo_taxi: {
      bruto: 3200,
      combustivel: -850,
      liquido: 2350,
      observacao: "R$800/semana meta · combustível é custo operacional"
    },

    outros_pix: {
      descricao: "PIX esporádicos",
      valor_medio: 0
    }
  },

  // ═══════════════════════════════════════════════════
  // ANÁLISE — Summary metrics
  // ═══════════════════════════════════════════════════
  analise: {
    deficit_mensal: -5224,
    deficit_com_mercado_pago: -7167,
    deficit_fevereiro_2027: -2232,
    observacao: "Entradas R$5.750 vs saídas R$10.974",

    projecoes: {
      julho_2026: {
        fatura_black: 4178,
        deficit: -4869,
        nota: "Sem Airbnb + Decathlon terminam em junho"
      },
      fevereiro_2027: {
        fatura_black: 2700,
        deficit: -2232,
        nota: "Kiwify termina em janeiro"
      }
    },

    alivios_programados: [
      {
        mes: "jun/2026",
        descricao: "CRC termina · Airbnb termina · +4 parcelamentos",
        economia: 1514
      },
      {
        mes: "jul/2026",
        descricao: "Decathlon 1 e 2 terminam",
        economia: 121
      },
      {
        mes: "out/2026",
        descricao: "Rocha Auto Peças termina",
        economia: 151
      },
      {
        mes: "nov/2026",
        descricao: "Magalu termina",
        economia: 300
      },
      {
        mes: "dez/2026",
        descricao: "Livelo + Omega terminam · 13º + PLR chegam",
        economia: 173,
        extras: 8725
      },
      {
        mes: "jan/2027",
        descricao: "Kiwify termina — último grande parcelado",
        economia: 615
      }
    ]
  },

  // ═══════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════
  metadata: {
    data_atualizacao: "2026-06-08",
    versao: "2.0",
    dashboard_url: "https://financeiro.descontoirresistivel.com.br"
  }
};

// ═══════════════════════════════════════════════════════════════════
// COMO USAR NO server.js
// ═══════════════════════════════════════════════════════════════════
/*

Na rota GET /api/dados, ao fazer merge com dados salvos, use DEEP MERGE:

  const mergeDeep = (target, source) => {
    const output = { ...target };
    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        output[key] = mergeDeep(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  };

  const merged = mergeDeep(DEFAULT_DATA, dados);
  return { statusCode: 200, headers, body: JSON.stringify(merged) };

Assim a frontend sempre recebe TODA a estrutura, mesmo que o usuário tenha
salvado apenas parcialmente.

*/

module.exports = DEFAULT_DATA;
