#!/usr/bin/env node
// Comandos do plugin: node manada.mjs eu | teto | lembrar <texto> | padrao
// Saem em texto simples, prontos para o Claude mostrar. Não imprimem a chave.
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { OMNIROUTE, arquivoSettings, baseEhOmni, chave, lerSettings, porteiro, quemSou } from "./lib.mjs";

const [, , cmd, ...resto] = process.argv;

function semChave() {
  return "Não achei a sua chave do OmniRoute da UnniSend nesta sessão. O plugin usa a mesma chave do Claude Code: confira se ANTHROPIC_BASE_URL aponta para https://omniroute.unnichat.com.br e se ANTHROPIC_AUTH_TOKEN está preenchida. Se estiver tudo certo, fale com o Israel.";
}

function faltam(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  let s = Math.max(0, Math.round((t - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  const tempo = `${d ? `${d}d ` : ""}${h || d ? `${h}h ` : ""}${m}min`;
  const local = new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `renova em ${tempo} (${local})`;
}

async function eu() {
  if (!chave()) return semChave();
  const r = await porteiro("/eu", { ms: 8000 });
  if (r.status === 0) return "O porteiro de memória não respondeu agora. Tente de novo em instantes.";
  if (r.status === 401) return "O OmniRoute recusou a sua chave. Fale com o Israel.";
  if (r.status === 403) return `O porteiro conhece a chave, mas não liberou memória: ${r.json?.detail ?? "sem motivo"}. Fale com o Israel.`;
  if (r.status !== 200 || !r.json) return `O porteiro respondeu ${r.status}. Tente de novo em instantes.`;
  const j = r.json;
  const nome = (b) => b.replace(/^manada-area-/, "").replace(/^manada-geral$/, "geral");
  return [
    `Você: ${j.pessoa}`,
    `Área: ${j.area}${j.extras?.length ? ` (também lê: ${j.extras.join(", ")})` : ""}`,
    `Memória que você lê: ${(j.le ?? []).map(nome).join(", ")}`,
    `Memória onde você grava: ${(j.grava ?? []).map(nome).join(", ")}`,
    `Ferramentas liberadas para você: ${j.ferramentas?.length ? j.ferramentas.join(", ") : "nenhuma"}`,
  ].join("\n");
}

async function teto() {
  const ch = chave();
  if (!ch) return semChave();
  let d;
  try {
    const r = await fetch(`${OMNIROUTE}/api/usage/om-usage?format=json`, {
      headers: { Authorization: `Bearer ${ch}`, "User-Agent": "manada-claude-code" },
      signal: AbortSignal.timeout(10_000),
    });
    if (r.status === 401) return "O OmniRoute recusou a sua chave. Fale com o Israel.";
    if (r.status === 403) return "A consulta do teto não está liberada na sua chave. Peça ao Israel para ligar.";
    if (!r.ok) return `O OmniRoute não respondeu a consulta (erro ${r.status}). Tente de novo em instantes.`;
    d = await r.json();
  } catch {
    return "Não consegui falar com o OmniRoute agora. Confira a internet e tente de novo.";
  }
  if (d.allowed === false) return "A consulta do teto não está liberada na sua chave. Peça ao Israel para ligar.";
  const linhas = ["Seu teto pessoal"];
  const p = d.personal ?? {};
  if (p.enabled) {
    for (const [nome, lim, gasto, reset, estourou] of [
      ["Hoje", "dailyLimitUsd", "dailySpentUsd", "dailyResetAtIso", "dailyExceeded"],
      ["Semana", "weeklyLimitUsd", "weeklySpentUsd", "weeklyResetAtIso", "weeklyExceeded"],
    ]) {
      const total = p[lim] || 0;
      if (!total) continue;
      const resta = Math.max(0, Math.round(100 - (100 * (p[gasto] || 0)) / total));
      linhas.push(`  ${nome}: restam ${resta}%, ${faltam(p[reset])}${p[estourou] ? "  LIMITE ATINGIDO" : ""}`);
    }
  } else {
    linhas.push("  Sua chave não tem teto em dólar.");
  }
  const rot = { "session (5h)": "Janela de 5 horas", "weekly (7d)": "Semana" };
  const janelas = Object.entries(d.provider?.quotas ?? {}).filter(([k]) => rot[k]);
  if (janelas.length) {
    linhas.push("", "Conta Claude da empresa que você usa (compartilhada com o time)");
    for (const [k, q] of janelas) linhas.push(`  ${rot[k]}: restam ${q.remainingPercentage ?? q.remaining}%, ${faltam(q.resetAt)}`);
  }
  linhas.push("", linhaModelo());
  linhas.push("", "Quando o seu teto acaba, a IA para até renovar. Se a conta da empresa acabar, o OmniRoute passa sozinho para a próxima conta.");
  return linhas.join("\n");
}

const MODELO_PADRAO = "claude/claude-sonnet-5-5";
const JANELA = "200000";

/** Linha do /manada:teto com o padrão gravado no settings.json do usuário (só leitura, não gasta token). */
function linhaModelo() {
  const r = lerSettings();
  if (!r.ok) return "Modelo padrão: não consegui ler o settings.json do Claude Code.";
  const m = r.dados.model;
  const j = r.dados.env?.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
  if (m === MODELO_PADRAO && String(j) === JANELA) return `Modelo padrão: ${m}, conversa comprimida em ${Number(j) / 1000} mil.`;
  return `Modelo padrão: ${m ?? "não definido"}${j ? `, compressão em ${j}` : ""}. Rode /manada:padrao para usar Sonnet com compressão em 200 mil.`;
}

/** /manada:padrao: grava Sonnet + compressão em 200 mil no settings.json do usuário, preservando o resto. */
function padrao() {
  if (!baseEhOmni()) return "Não mudei nada: este Claude Code não está apontado para o OmniRoute da UnniSend (ANTHROPIC_BASE_URL). O padrão só vale para quem usa o OmniRoute.";
  const r = lerSettings();
  if (!r.ok) return `Não mudei nada: não consegui ler ${arquivoSettings()} (ele existe, mas não é um JSON válido). Corrija ou apague esse arquivo e rode de novo.`;
  const antes = r.dados.model;
  const novo = { ...r.dados, model: MODELO_PADRAO, env: { ...(r.dados.env && typeof r.dados.env === "object" ? r.dados.env : {}), CLAUDE_CODE_AUTO_COMPACT_WINDOW: JANELA } };
  const arq = arquivoSettings();
  try {
    mkdirSync(dirname(arq), { recursive: true });
    const tmp = `${arq}.manada-${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(novo, null, 2) + "\n");
    renameSync(tmp, arq);
  } catch (e) {
    return `Não consegui gravar ${arq} (${e.code ?? "erro"}). Nada foi mudado.`;
  }
  return `Pronto: Sonnet como padrão e conversa comprimida em 200 mil. Feche e abra o Claude Code. Para usar o Opus numa conversa: /model claude/claude-opus-5-5.${antes && antes !== MODELO_PADRAO ? ` (O padrão anterior era ${antes}.)` : ""}`;
}

async function lembrar(texto) {
  if (!chave()) return semChave();
  const t = texto.trim();
  if (!t) return "Escreva o que é para lembrar depois do comando. Ex.: /manada:lembrar o deploy do app sai às sextas.";
  const r = await porteiro("/v1/default/banks/auto/memories", {
    metodo: "POST",
    corpo: { async: true, items: [{ content: t.slice(0, 4000), context: "fato pedido explicitamente pela pessoa para a memória da empresa", timestamp: new Date().toISOString(), tags: ["origem:claude-code", "lembrar"] }] },
    ms: 10_000,
  });
  if (r.status === 0) return "O porteiro de memória não respondeu. Nada foi gravado; tente de novo em instantes.";
  if (r.status !== 200) return `O porteiro recusou (${r.status}): ${r.json?.detail ?? "sem motivo"}. Nada foi gravado.`;
  if ((r.json?.items_count ?? 1) === 0) return "O porteiro não gravou: o texto parece ter dado sensível (e-mail, telefone, CPF, chave ou senha). Tire isso e tente de novo.";
  const eu = await quemSou(3000);
  return `Anotado na memória da empresa${eu?.area ? ` (área ${eu.area} e geral)` : ""}. Leva até 1 minuto para aparecer nas buscas.`;
}

const saida = cmd === "eu" ? await eu() : cmd === "teto" ? await teto() : cmd === "lembrar" ? await lembrar(resto.join(" ")) : cmd === "padrao" ? padrao() : "Comando desconhecido. Use eu, teto, lembrar ou padrao.";
process.stdout.write(saida + "\n");
