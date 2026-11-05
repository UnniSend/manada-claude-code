---
name: eu
description: Mostra quem você é para a memória da empresa: nome, área, memória que lê e grava, ferramentas liberadas.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs":*)
---

## Resultado

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs" eu`

## Instruções

Mostre o resultado acima para a pessoa exatamente como veio, sem acrescentar análise, sem rodar mais nada e sem chamar ferramentas. Se o resultado pedir para falar com o Israel, repita isso.
