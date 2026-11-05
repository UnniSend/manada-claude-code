// Biblioteca comum do plugin Manada para Claude Code. Node puro (18+), sem dependências: roda igual
// em Mac, Linux e Windows. Nada aqui grava chave em disco nem a imprime.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

export const PORTEIRO = (process.env.MANADA_PORTEIRO_URL || "https://memoria.unnichat.com.br").replace(/\/+$/, "");
export const OMNIROUTE = (process.env.MANADA_OMNIROUTE_URL || "https://omniroute.unnichat.com.br").replace(/\/+$/, "");
const HOST_OMNI = "omniroute.unnichat.com.br";

/**
 * A chave pessoal é a MESMA que o Claude Code já usa (ANTHROPIC_AUTH_TOKEN). Só é enviada ao porteiro
 * quando o Claude Code aponta para o OmniRoute da UnniSend: uma chave da Anthropic ou de outro
 * provedor nunca sai daqui. MANADA_CHAVE força uma chave específica (teste).
 */
export function chave() {
  if (process.env.MANADA_CHAVE) return process.env.MANADA_CHAVE.trim();
  const base = process.env.ANTHROPIC_BASE_URL || "";
  let host = "";
  try { host = new URL(base).host; } catch { return null; }
  if (host !== HOST_OMNI) return null;
  const k = (process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || "").trim();
  return k || null;
}

/** Memória desligada nesta sessão: MANADA_MEMORIA=off (ou 0/nao/false) antes de abrir o claude. */
export function memoriaLigada() {
  const v = (process.env.MANADA_MEMORIA || "").trim().toLowerCase();
  return !["off", "0", "nao", "não", "false", "desligada"].includes(v);
}

export async function lerEntrada() {
  let txt = "";
  for await (const c of process.stdin) txt += c;
  try { return JSON.parse(txt || "{}"); } catch { return {}; }
}

/** Chamada ao porteiro com timeout curto. Nunca lança: devolve {status, json} ou {status: 0}. */
export async function porteiro(caminho, { metodo = "GET", corpo, ms = 5000, k } = {}) {
  const ch = k ?? chave();
  if (!ch) return { status: 0, json: null, motivo: "sem_chave" };
  try {
    const r = await fetch(PORTEIRO + caminho, {
      method: metodo,
      headers: { Authorization: `Bearer ${ch}`, "Content-Type": "application/json", "User-Agent": "manada-claude-code" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(ms),
    });
    const t = await r.text();
    let json = null;
    try { json = t ? JSON.parse(t) : null; } catch { json = null; }
    return { status: r.status, json };
  } catch {
    return { status: 0, json: null, motivo: "fora_do_ar" };
  }
}

// Estado por sessão (último pedido, identidade em cache) fica na pasta de dados do plugin, nunca a chave.
const pasta = () => {
  const p = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "manada-claude-code");
  try { mkdirSync(p, { recursive: true }); } catch { /* sem pasta: segue sem cache */ }
  return p;
};
const nomeSeguro = (s) => String(s || "x").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "x";

export function guardar(nome, valor) {
  try { writeFileSync(join(pasta(), nomeSeguro(nome) + ".json"), JSON.stringify(valor)); } catch { /* ignora */ }
}
export function ler(nome) {
  try { return JSON.parse(readFileSync(join(pasta(), nomeSeguro(nome) + ".json"), "utf8")); } catch { return null; }
}

/** Quem é a pessoa desta chave (nome, área), pelo porteiro. Cache de 1 hora, por hash da chave. */
export async function quemSou(ms = 4000) {
  const ch = chave();
  if (!ch) return null;
  const id = "eu-" + createHash("sha256").update(ch).digest("hex").slice(0, 16);
  const c = ler(id);
  if (c && c.em > Date.now() - 3600_000) return c.eu;
  const r = await porteiro("/eu", { ms });
  if (r.status !== 200 || !r.json) return null;
  guardar(id, { em: Date.now(), eu: r.json });
  return r.json;
}

export const PREAMBULO =
  "# Memória da empresa (UnniSend)\n" +
  "Fatos compartilhados da sua área e gerais da empresa, lembrados pelo porteiro de memória. Prefira o fato mais recente " +
  "quando houver conflito. Se nada responder à pergunta, diga que a memória da empresa não tem a resposta; nunca invente.";

export const CONTEXTO_RETAIN =
  "conversa de trabalho entre o Claude Code e uma pessoa da UnniSend; preservar decisões, combinados, nomes de projetos e " +
  "contexto durável da área; estados temporários devem ter data explícita";

/** Linha de identidade que os agentes usam (Angela e Holly recusam quem não é da gestão). */
export function linhaIdentidade(eu) {
  if (!eu || !eu.pessoa) return "";
  const extras = Array.isArray(eu.extras) && eu.extras.length ? ` (também lê: ${eu.extras.join(", ")})` : "";
  return `Pessoa da UnniSend nesta sessão (confirmado pelo porteiro de memória): ${eu.pessoa}, área ${eu.area}${extras}.`;
}
