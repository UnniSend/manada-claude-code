#!/usr/bin/env node
// Hook UserPromptSubmit: antes de cada pedido, busca na memória da empresa (porteiro) o que tem a ver
// com ele e entrega ao Claude como contexto. Também guarda o pedido para o hook Stop gravar a troca.
// Falha silenciosa: sem chave, porteiro fora do ar ou lento = sai sem nada e o Claude Code segue normal.
import { CONTEXTO_RETAIN, PREAMBULO, chave, guardar, lerEntrada, linhaIdentidade, memoriaLigada, porteiro, quemSou } from "./lib.mjs";

const MAX_CONTEXTO = 6000;

// O porteiro junta os resultados de vários bancos (área + geral, ou todos para a gestão) e cada banco
// pontua na própria escala, então a ordem que chega não é confiável. Reordena aqui: palavras do pedido
// que aparecem no começo do fato pesam mais; a semelhança semântica do Hindsight (0 a 1) desempata.
const PARADAS = new Set("a o e de da do das dos em no na nos nas um uma para por com sem que qual quais como quem onde quando e so sobre ao aos me te se eu voce isso esse essa este esta the of to and is".split(" "));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const termos = (s) => [...new Set(norm(s).split(/[^a-z0-9-]+/).filter((t) => t.length > 2 && !PARADAS.has(t)))];

export function ordenar(fatos, pedido) {
  const ts = termos(pedido);
  const nota = (f) => {
    // Só o começo do fato conta: fato enorme acertaria qualquer pergunta por acaso.
    const txt = norm(String(f?.text ?? "").slice(0, 240));
    const acertos = ts.filter((t) => txt.includes(t)).length;
    const s = f?.scores ?? {};
    // keyword do Hindsight não entra: a escala dele varia de banco para banco (0 a 4+) e soterrava o resto.
    return (ts.length ? acertos / ts.length : 0) * 2 + (s.semantic ?? 0);
  };
  return fatos.map((f, i) => ({ f, n: nota(f), i })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.f);
}

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
      corpo: { query: prompt.slice(0, 2000), budget: "low", max_tokens: 3000, types: ["world", "experience", "observation"] },
      ms: 5000,
    }),
  ]);
  const fatos = r.status === 200 && Array.isArray(r.json?.results) ? r.json.results : [];
  const vistos = new Set();
  const linhas = [];
  let total = 0;
  for (const f of ordenar(fatos, prompt)) {
    const bruto = String(f?.text ?? "").replace(/\s+/g, " ").trim();
    const t = bruto.length > 500 ? bruto.slice(0, 497) + "..." : bruto;
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
