---
name: lembrar
description: Grava um fato na memória da empresa (sua área e a geral). Uso: /manada:lembrar <o que lembrar>
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs":*)
argument-hint: "<o que lembrar>"
---

## Resultado

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs" lembrar "$ARGUMENTS"`

## Instruções

Mostre o resultado acima para a pessoa exatamente como veio, sem acrescentar análise, sem rodar mais nada e sem chamar ferramentas. Se o resultado pedir para falar com o Israel, repita isso.
