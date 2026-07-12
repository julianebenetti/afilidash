# Matriz de Dependencias

## Validacao antes de otimizar
- Antes de tocar em cache, anote 2 ou 3 casos reais com o numero esperado de hoje.
- Compare depois da mudanca com esses numeros registrados, nao com impressao visual.
- O estado visual nunca entra nessa conta; so numero e fonte de dado.

## Regras gerais
- `escopoAtual()` define visibilidade da tela.
- `r.Conta` define proveniencia do dado.
- Estado visual nunca invalida agregado.
- Fonte de dado pode invalidar agregado.

## Meta GMV
Usa:
- `DADOS`
- `MGV_CONFIG`
- `MGV_PLAN`
- `MGV_HIST_PLAT`
- `CFG_CAMPANHAS`
- `CFG_SHOPEE.mgvAtivo`
- `CFG_FISCAL_META`
- `CFG_FISCAL`
- `mgvContaAtiva`
- `mgvMesOffset`
- `mgvExpanded`
- `escopoAtual()`

Invalida quando:
- muda `DADOS`
- muda `MGV_CONFIG`
- muda `MGV_PLAN`
- muda `MGV_HIST_PLAT`
- muda `CFG_CAMPANHAS`
- muda `CFG_SHOPEE.mgvAtivo`
- muda `CFG_FISCAL_META`
- muda `CFG_FISCAL`
- muda a conta do filtro da navbar
- muda o mÃªs navegado

Nao invalida quando:
- muda `mensalOcultas`
- muda `mensalMascaradas`
- muda `mensalExpanded`
- muda `mensalLinhaSelecionada`

## Resumo Mensal
Usa:
- `DADOS`
- `MGV_CONFIG`
- `MGV_HIST_PLAT`
- `CFG_OPERACOES`
- `CFG_FISCAL`
- `CFG_FISCAL_META`
- `escopoAtual()`
- `mensalOcultas`
- `mensalMascaradas`
- `mensalExpanded`
- `mensalLinhaSelecionada`

Invalida quando:
- muda `DADOS`
- muda `MGV_CONFIG`
- muda `MGV_HIST_PLAT`
- muda `CFG_OPERACOES`
- muda `CFG_FISCAL`
- muda `CFG_FISCAL_META`
- muda o filtro da navbar

Nao invalida quando:
- muda apenas o estado visual da tela

## Dependencias compartilhadas
- `escopoAtual()` filtra a visibilidade das duas telas.
- `resolverOperacao()` depende de `CFG_OPERACOES`.
- `mgvPlataformaNaData()` depende de `MGV_HIST_PLAT`.
- `derivar()` depende de `CFG_FISCAL` e `CFG_FISCAL_META`.
- `statusEfetivoCampanha()` depende de `CFG_CAMPANHAS`.

## Notas praticas
- `CFG_OPERACOES` muda pouco, mas precisa entrar na assinatura de Resumo Mensal.
- `mensalOcultas`, `mensalMascaradas`, `mensalExpanded` e `mensalLinhaSelecionada` so mexem no desenho da tela.
- Se a fonte nao mudou, o agregado nao deve ser recalculado.
