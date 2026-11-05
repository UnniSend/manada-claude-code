---
name: teto
description: "Mostra quanto falta do seu teto de IA hoje e na semana, e da conta Claude da empresa. Não gasta cota de modelo."
disable-model-invocation: true
allowed-tools: 'Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs":*)'
---

## Resultado

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs" teto`

## Instruções

Mostre o resultado acima para a pessoa exatamente como veio, sem acrescentar análise, sem rodar mais nada e sem chamar ferramentas. Se o resultado pedir para falar com o Israel, repita isso.
