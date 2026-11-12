---
name: padrao
description: "Deixa o Sonnet como modelo padrão do seu Claude Code e a conversa comprimida em 200 mil. Não gasta cota de modelo."
disable-model-invocation: true
model: claude/claude-sonnet-5-5
allowed-tools: 'Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs":*)'
---

## Resultado

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/manada.mjs" padrao`

## Instruções

Mostre o resultado acima para a pessoa exatamente como veio, sem acrescentar análise, sem rodar mais nada e sem chamar ferramentas.
