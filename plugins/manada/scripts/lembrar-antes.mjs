#!/usr/bin/env node
// Hook UserPromptSubmit: antes de cada pedido, busca na memória da empresa (porteiro) o que tem a ver
// com ele e entrega ao Claude como contexto. Também guarda o pedido para o hook Stop gravar a troca.
// Falha silenciosa: sem chave, porteiro fora do ar ou lento = sai sem nada e o Claude Code segue normal.
import { CONTEXTO_RETAIN, PREAMBULO, chave, guardar, lerEntrada, linhaIdentidade, memoriaLigada, porteiro, quemSou } from "./lib.mjs";

const MAX_CONTEXTO = 6000;

async function main() {
  const e = await lerEntrada();
  const prompt = typeof e.prompt === "string" ? e.prompt : "";
  if (!memoriaLigada() || !chave() || !prompt.trim()) return;
  if (prompt.trim().startsWith("/")) return; // comando do Claude Code não vira memória nem busca
  guardar(`turno-${e.session_id}`, { prompt: prompt.slice(0, 8000), em: Date.now(), contexto: CONTEXTO_RETAIN });

  const [eu, r] = await Promise.all([
    quemSou(3000),
    porteiro("/v1/default/banks/auto/memories/recall", {
      metodo: "POST",
      corpo: { query: prompt.slice(0, 2000), budget: "low", max_tokens: 1200, types: ["world", "experience", "observation"] },
      ms: 4000,
    }),
  ]);
  const fatos = r.status === 200 && Array.isArray(r.json?.results) ? r.json.results : [];
  const vistos = new Set();
  const linhas = [];
  let total = 0;
  for (const f of fatos) {
    const t = String(f?.text ?? "").replace(/\s+/g, " ").trim();
    if (!t || vistos.has(t)) continue;
    vistos.add(t);
    const quando = (f?.mentioned_at || f?.occurred_start || "").slice(0, 10);
    const linha = `- ${t}${quando ? ` (${quando})` : ""}`;
    if (total + linha.length > MAX_CONTEXTO) break;
    linhas.push(linha);
    total += linha.length;
    if (linhas.length >= 12) break;
  }
  const partes = [];
  const id = linhaIdentidade(eu);
  if (id) partes.push(id);
  if (linhas.length) partes.push(PREAMBULO + "\n\n" + linhas.join("\n"));
  if (!partes.length) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: partes.join("\n\n") } }));
}

main().catch(() => {}).finally(() => process.exit(0));
