#!/usr/bin/env node
// Hook Stop: quando o Claude termina de responder, grava a troca (pedido + resposta) na memória da empresa
// pelo porteiro. O porteiro decide o banco pela área da pessoa e recusa dado sensível (e-mail, telefone,
// CPF, chave, senha). Roda em segundo plano (async no hooks.json): não atrasa a próxima mensagem.
// Falha silenciosa sempre.
import { CONTEXTO_RETAIN, chave, ler, lerEntrada, memoriaLigada, porteiro } from "./lib.mjs";

async function main() {
  const e = await lerEntrada();
  if (!memoriaLigada() || !chave() || e.stop_hook_active) return;
  const turno = ler(`turno-${e.session_id}`);
  const resposta = typeof e.last_assistant_message === "string" ? e.last_assistant_message : "";
  if (!turno?.prompt || !resposta.trim()) return;
  if (Date.now() - (turno.em ?? 0) > 6 * 3600_000) return; // pedido velho de outra rodada
  const conteudo = `Pessoa: ${turno.prompt.trim()}\n\nClaude Code: ${resposta.trim()}`.slice(0, 12000);
  await porteiro("/v1/default/banks/auto/memories", {
    metodo: "POST",
    corpo: {
      async: true,
      items: [{
        content: conteudo,
        context: CONTEXTO_RETAIN,
        timestamp: new Date().toISOString(),
        document_id: `cc-${String(e.session_id || "x").slice(0, 60)}-${turno.em}`,
        tags: [`session:cc-${String(e.session_id || "x").slice(0, 60)}`, "origem:claude-code"],
        metadata: { source: "manada-claude-code", session_id: String(e.session_id || "") },
      }],
    },
    ms: 8000,
  });
}

main().catch(() => {}).finally(() => process.exit(0));
