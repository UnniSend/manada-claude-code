#!/usr/bin/env node
// Hook Stop: quando o Claude termina de responder, grava a troca (pedido + resposta) na memória da empresa
// pelo porteiro. O porteiro decide o banco pela área da pessoa e recusa dado sensível (e-mail, telefone,
// CPF, chave, senha).
// Não atrasa nada: o hook lê a entrada, solta um processo filho destacado que faz o envio e sai na hora.
// (Um hook "async" do Claude Code é cancelado quando o processo do Claude sai, por exemplo em `claude -p`;
// o filho destacado sobrevive.) Falha silenciosa sempre.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CONTEXTO_RETAIN, apagar, chave, guardar, ler, lerEntrada, memoriaLigada, porteiro } from "./lib.mjs";

async function enviar(arquivo) {
  const p = ler(arquivo);
  if (!p) return;
  await porteiro("/v1/default/banks/auto/memories", { metodo: "POST", corpo: p.corpo, ms: 15_000 });
  apagar(arquivo);
}

async function principal() {
  const e = await lerEntrada();
  if (!memoriaLigada() || !chave() || e.stop_hook_active) return;
  const turno = ler(`turno-${e.session_id}`);
  const resposta = typeof e.last_assistant_message === "string" ? e.last_assistant_message : "";
  if (!turno?.prompt || !resposta.trim()) return;
  if (Date.now() - (turno.em ?? 0) > 6 * 3600_000) return; // pedido velho de outra rodada
  const sessao = String(e.session_id || "x").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60);
  const conteudo = `Pessoa: ${turno.prompt.trim()}\n\nClaude Code: ${resposta.trim()}`.slice(0, 12000);
  const corpo = {
    async: true,
    items: [{
      content: conteudo,
      context: CONTEXTO_RETAIN,
      timestamp: new Date().toISOString(),
      document_id: `cc-${sessao}-${turno.em}`,
      tags: [`session:cc-${sessao}`, "origem:claude-code"],
      metadata: { source: "manada-claude-code", session_id: sessao },
    }],
  };
  const arquivo = `envio-${sessao}-${turno.em}`;
  guardar(arquivo, { corpo });
  // A chave segue pelo ambiente herdado (nunca em argumento nem em arquivo).
  const filho = spawn(process.execPath, [fileURLToPath(import.meta.url), "--enviar", arquivo], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: process.env,
  });
  filho.unref();
}

const [, , modo, arq] = process.argv;
(modo === "--enviar" ? enviar(arq) : principal()).catch(() => {}).finally(() => process.exit(0));
