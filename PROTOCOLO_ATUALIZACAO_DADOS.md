# 📋 PROTOCOLO DE ATUALIZAÇÃO DE DADOS — Dashboard Financeiro

## Estabelecido em: Agosto 2026
**Última revisão:** 08/08/2026

---

## 🎯 OBJETIVO

Garantir que as atualizações do dashboard financeiro sejam feitas de forma segura, rastreável e com total controle do usuário sobre as mudanças.

---

## 📥 PROCESSO DE ATUALIZAÇÃO (5 ETAPAS)

### **ETAPA 1: ENVIO DE DOCUMENTOS**

**O usuário envia:**
- Extratos bancários em PDF (mensais)
- Faturas de cartões em PDF (Black, Azul, Infinite, etc)
- Holerites em PDF (quando há dúvida sobre descontos)
- Screenshots de tela (CRC, gerenciador de tráfego, etc)
- Qualquer outro documento relevante

**Formato aceito:** PDF, XLS, XLSX, PNG, JPG, GIF

---

### **ETAPA 2: EXTRAÇÃO E CLASSIFICAÇÃO**

**Claude (IA) realiza:**
1. Leitura dos documentos
2. Identificação de cada lançamento/valor
3. Classificação:
   - [ ] Pessoal ou negócio?
   - [ ] Entrada, saída fixa ou saída variável?
   - [ ] A qual categoria pertence?
4. Marcação de itens desconhecidos/dúvidas

**Saída esperada:**
```
✅ Itens identificados: 47
⚠️  Itens em dúvida: 3
❓ Dúvidas:
   - "HUB DO" → pessoal ou negócio?
   - "PIX BENETTI" → entrada ou saída?
   - "Daniela R$150" → o que é?
```

---

### **ETAPA 3: CONFIRMAÇÃO DE DÚVIDAS**

**Claude questiona item por item:**
```
Encontrei 3 itens desconhecidos. Pode me confirmar?

1. HUB DO — R$ 89,90
   Classificação sugerida: Pessoal/Saída Variável
   Você confirma? [S/N] Qual categoria?

2. PIX BENETTI — R$ 500,00
   Tipo: Entrada ou Saída?
   De quem? Para quem?

3. Daniela — R$ 150,00
   É despesa pessoal? Categoria?
```

**Usuário responde cada um:**
```
1. Sim, é pessoal/gastos variáveis/transporte
2. É saída, pagamento para Daniela (serviço)
3. Faxina mensinha, fixo/casa
```

---

### **ETAPA 4: PROPOSIÇÃO DE MUDANÇAS**

**Claude propõe ANTES de alterar:**

```
📋 RESUMO DAS MUDANÇAS PROPOSTAS:

ATUALIZAÇÕES EM DIVIDAS:
- Mastercard Black: R$ 5.692 → R$ 5.280 (redução de R$412)
- Bradesco Amazon: R$ 67 → R$ 0 (quitado ✅)

ATUALIZAÇÕES EM DESPESAS:
+ Adicionar novo item: Serviço Daniela (R$150/mês, fixo)
+ Corrigir Faxina Nilza: R$150 → R$180 (aumento confirmado)

ATUALIZAÇÕES EM RECEITAS:
+ PIX Benetti: confirmar se é entrada recorrente?

IMPACTO NO DASHBOARD:
- Dívida total: R$ 109.838 → R$ 109.426 (-R$ 412)
- Saldo conta: R$ 5.587 → R$ 5.587 (sem mudança)
- Déficit mensal: -R$ 5.224 → -R$ 5.392 (-R$ 168 pior)

⚠️  ALERTA: Déficit piorou em R$168/mês

Você autoriza essas mudanças? [S/N]
```

**Regra importante:** ❌ **Nunca altera sem confirmação explícita do usuário**

---

### **ETAPA 5: EXECUÇÃO E DOWNLOAD**

**Se usuário confirmar:**

```
✅ MUDANÇAS APLICADAS:
   - DEFAULT_DATA atualizado
   - Arquivo salvo
   - Dashboard refreshado

📥 Download do arquivo atualizado:
   financeiro_dashboard_completo.html
   (salvar com data: dashboard_2026-08-08.html)
```

**Usuário faz download e guarda histórico local.**

---

## ⚙️ REGRAS DE OURO

### 🔐 **Segurança & Controle**

| Regra | Por quê? |
|-------|---------|
| ✅ Sempre propor ANTES de alterar | Evita mudanças acidentais |
| ✅ Mostrar impacto das mudanças | Usuário entende consequências |
| ✅ Aguardar confirmação explícita | Nenhuma ambiguidade |
| ✅ Listar dúvidas item por item | Nada passa desapercebido |
| ✅ Manter histórico de arquivos | Poder fazer rollback |

### 📊 **Dados & Classificação**

| Tipo | Significado | Exemplos |
|------|-------------|----------|
| **Entrada** | Dinheiro que entra | Salário, PIX recebido, venda |
| **Saída Fixa** | Despesa mensal recorrente | Aluguel, internet, faxina |
| **Saída Variável** | Gasto não recorrente | Compras, uber, supermercado |
| **Pessoal** | Gasto individual | Roupa, comida, diversão |
| **Negócio** | Gasto para negócio | Ads, material, taxas |

### 🚫 **O que NÃO fazer**

- ❌ Alterar dados sem pedir confirmação
- ❌ Assumir o significado de lançamento estranho
- ❌ Agrupar múltiplas mudanças sem listar cada uma
- ❌ Não mostrar o impacto no déficit/saldo
- ❌ Esquecer de fazer backup antes

---

## 📝 EXEMPLO DE UMA SESSÃO COMPLETA

**Usuário:** "Claude, aqui estão os PDFs de julho"

**Claude (Etapa 2-3):**
```
Li os arquivos. Encontrei 3 dúvidas:
1. "Daniela R$150" — serviço, pessoal, fixo?
2. "HUB DO R$89,90" — categoria?
3. "PIX BENETTI R$1.500" — entrada ou erro?
Pode confirmar?
```

**Usuário:** "Daniela é faxina (fixo), HUB é uber (variável), PIX é entrada verdadeira"

**Claude (Etapa 4):**
```
Proposição de mudanças:
- Déficit: -R$ 5.224 → -R$ 5.392
- Saldo: sem mudança
- Novos itens: +Daniela faxina

Confirma? [S/N]
```

**Usuário:** "Sim, confirmo"

**Claude (Etapa 5):**
```
✅ Aplicado
📥 Download: dashboard_2026-07-31.html
```

---

## 📞 DÚVIDAS NA PRÓXIMA SESSÃO

**Quando retornar em outro chat, Cole este protocolo:**

```
Este é o protocolo padrão de atualização. 
Siga as mesmas 5 etapas.

Documentos a enviar:
- PDFs de extratos/faturas
- Screenshots de novos lançamentos
- Qualquer mudança na estrutura de receitas/despesas
```

---

## ✅ CHECKLIST ANTES DE ATUALIZAR

- [ ] Todos os documentos foram lidos?
- [ ] Todos os dúbidas foram resolvidas?
- [ ] Impacto foi apresentado?
- [ ] Usuário confirmou explicitamente?
- [ ] Backup foi feito?
- [ ] Arquivo atualizado está pronto para download?
- [ ] Histórico foi mantido?

---

**Documento Normativo | Válido para todos os chats futuros**
