# 🚀 GUIA DE IMPORTAÇÃO AUTOMÁTICA DE DADOS

**Sistema de Upload Inteligente com Detecção Automática**

---

## 📌 COMO FUNCIONA

### Você envia arquivos → Sistema extrai dados → Você confirma → Dashboard atualiza

```
[PDF/XLS/Imagens]
        ↓
   [Upload]
        ↓
[Extração Automática]
        ↓
[Identificação de Dúvidas]
        ↓
   [Review + Confirmação]
        ↓
[Aplicar & Salvar]
```

---

## 📁 ARQUIVOS QUE VOCÊ PODE ENVIAR

| Tipo | Exemplos | O que é extraído |
|------|----------|------------------|
| **PDF** | Extratos, Faturas, Holerites | Valores, datas, descrições |
| **XLS/XLSX** | Planilhas próprias | Tabelas estruturadas |
| **PNG/JPG** | Screenshots, fotos | OCR de valores/textos |
| **JSON** | Backup anterior | Importa direto |

---

## 🔧 TIPOS DE DADOS EXTRAÍDOS

### Do Extrato Bancário (PDF)
```json
{
  "tipo": "extrato",
  "banco": "Itaú",
  "data": "2026-08-08",
  "lançamentos": [
    {
      "data": "2026-08-05",
      "descricao": "Uber",
      "valor": -89.90,
      "tipo": "saida_variavel",
      "categoria": "sugerida: transporte"
    }
  ]
}
```

### Da Fatura do Cartão (PDF)
```json
{
  "tipo": "fatura_cartao",
  "cartao": "Black",
  "mes": "agosto/2026",
  "total": 5692.00,
  "itens": [
    {
      "descricao": "Supermercado ABC",
      "valor": 250.50,
      "categoria": "supermercado"
    }
  ]
}
```

### De Screenshot (PNG/JPG)
```json
{
  "tipo": "screenshot",
  "conteudo_identificado": [
    {
      "valor": "R$ 150,00",
      "descricao": "Faxina",
      "data": "2026-08-08"
    }
  ],
  "confianca": "Alta"
}
```

---

## 📋 PROCESSO PASSO A PASSO

### **PASSO 1: Prepare seus arquivos**

Coloque em uma pasta:
```
atualizacao_agosto_2026/
├── extrato_itau_agosto.pdf
├── fatura_black_agosto.pdf
├── fatura_azul_agosto.pdf
├── fatura_infinite_agosto.pdf
├── screenshot_crc.png
└── holerite_agosto.pdf
```

### **PASSO 2: Envie os arquivos**

No chat:
```
"Aqui estão os documentos de agosto/2026"
[Anexe os arquivos]
```

### **PASSO 3: Revise a extração**

Sistema retorna:
```
✅ EXTRAÇÃO COMPLETA

📊 Resumo:
- Extratos lidos: 1
- Faturas lidas: 3
- Screenshots processadas: 1
- Lançamentos identificados: 47
- Itens com dúvida: 3

⚠️  DÚVIDAS ENCONTRADAS:

1. "HUB DO" — R$ 89,90
   ➜ É transporte? Personal? Negócio?

2. "PIX BENETTI" — R$ 1.500,00
   ➜ É entrada ou foi erro?

3. "Daniela" — R$ 150,00
   ➜ Qual é o serviço? É fixo?

Por favor, confirme cada dúvida.
```

### **PASSO 4: Responda as dúvidas**

Você escreve:
```
1. HUB DO → Transporte/Personal/Variável
2. PIX BENETTI → Entrada verdadeira
3. Daniela → Faxina/Fixo/Personal
```

### **PASSO 5: Aprove as mudanças**

Sistema mostra:
```
📋 MUDANÇAS PROPOSTAS:

DÍVIDAS:
- Black: R$ 5.692,00 → R$ 5.280,00 (-R$ 412)

DESPESAS:
+ Novo: Faxina Daniela R$ 150/mês
+ Novo: HUB DO R$ 89,90 (agosto)

RECEITAS:
+ PIX BENETTI R$ 1.500,00 (agosto)

IMPACTO:
- Déficit mensal: -R$ 5.224 → -R$ 5.392
- Saldo: R$ 5.587 (sem mudança)

Autoriza? [SIM/NÃO]
```

Você responde: `SIM`

### **PASSO 6: Download**

Sistema retorna:
```
✅ APLICADO COM SUCESSO

Arquivo atualizado:
📥 financeiro_dashboard_completo_2026-08-08.html
```

---

## ⚡ CASOS DE USO ESPECIAIS

### Caso 1: Apenas confirmação de um valor

**Você envia:** PDF com um extrato

**Sistema detecta:** "Novo lançamento desconhecido"

**Fluxo:**
1. Extrai: "PIX Rogerio R$ 200"
2. Pergunta: "É pessoal ou negócio?"
3. Você: "Pessoal"
4. Pronto! Atualiza

### Caso 2: Múltiplas faturas juntas

**Você envia:** 3 PDFs de cartão + 1 extrato

**Sistema:**
1. Processa cada um
2. Agrupa por tipo
3. Lista mudanças consolidadas
4. Pede confirmação única

### Caso 3: Atualização mensal recorrente

**Você envia:** Sempre no mesmo formato

**Sistema:**
1. Aprende o padrão
2. Reduz dúvidas em sessões seguintes
3. Fica mais rápido!

---

## 🤖 O QUE O SISTEMA IDENTIFICA AUTOMATICAMENTE

### Cartões

✅ Identifica: Black, Azul, Infinite, Amazon
✅ Extrai: Fatura total, data de vencimento, itens

### Extratos Bancários

✅ Identifica: Itaú, Bradesco, Caixa, etc
✅ Extrai: Saldo, lançamentos, datas

### Documentos Pessoais

✅ Identifica: Holerite, recibos, NF
✅ Extrai: Valores, períodos, descrições

### Screenshots

✅ Identifica: Valores em reais (R$)
✅ Extrai: Números, datas, nomes

---

## ⚠️ LIMITAÇÕES & SOLUÇÕES

| Problema | Solução |
|----------|---------|
| PDF está em imagem | Use screenshot em vez de PDF escaneado |
| Valor não foi identificado | Confirme manualmente durante review |
| Data está errada | Sistema pergunta antes de aplicar |
| Descrição ambígua | Sistema marca como dúvida para confirmar |

---

## 📞 DÚVIDAS FREQUENTES

**P: Preciso enviar TODOS os PDFs de uma vez?**
R: Não! Você pode enviar:
- Um arquivo por vez
- Vários arquivos de uma vez
- Separado por mês
- Como preferir!

**P: E se eu enviar um arquivo errado?**
R: Sem problema! Sistema identifica. Se não conseguir ler, avisa e pula.

**P: Os dados antigos desaparecem?**
R: Não! O sistema usa **deep merge**. Dados novos atualizam, dados antigos são preservados.

**P: Posso voltar atrás (rollback)?**
R: Sim! Sempre mantemos histórico de arquivos anteriores.

**P: Quanto tempo leva para processar?**
R: Depende da quantidade de arquivos:
- 1-3 PDFs: ~2-3 minutos
- 5-10 arquivos: ~5-10 minutos
- Múltiplos meses: ~15-20 minutos

---

## ✅ CHECKLIST ANTES DE ENVIAR

- [ ] Arquivos em formato legível (PDF, XLS, PNG)
- [ ] Documentos recentes (mês/ano corretos)
- [ ] Nenhuma informação sensível confidencial
- [ ] Arquivos bem legíveis (não borrados)
- [ ] Incluindo todos os meses necessários

---

## 🎯 PRÓXIMOS PASSOS

**Depois que dominar o processo:**

1. ✅ Enviar documentos mensalmente
2. ✅ Confirmar dúvidas rapidamente
3. ✅ Manter histórico atualizado
4. ✅ Usar dados para análises mensais

---

**Está pronto para começar a importar dados?** 🚀

Envie seus documentos e o sistema fará o resto!
