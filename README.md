# Manada para Claude Code

Plugin da UnniSend para quem usa o Claude Code ligado ao OmniRoute da empresa. Usa a MESMA chave que você já tem no Claude Code: não precisa de chave nova nem de cadastro.

## Instalar (uma vez)

```
claude plugin marketplace add UnniSend/manada-claude-code
claude plugin install manada@unnisend
```

Depois feche e abra o Claude Code. Para conferir, rode `/manada:eu`.

## O que você ganha

- **Memória da empresa.** Antes de cada pedido, o Claude busca na memória da UnniSend o que tem a ver com ele (da sua área e da geral). No fim de cada resposta, a troca vai para a memória da sua área. Quem decide o que você lê e onde grava é o porteiro do Manada, pela sua área no Notion. Texto com e-mail, telefone, CPF, chave ou senha não é gravado.
- **Agentes da UnniSend:** michael (porta de entrada), buchecha (projetos), dwight (regras e processos), jim (comercial e comunicação), ryan (marketing), phyllis (eventos), angela e holly (só gestão; recusam as outras áreas). Use pedindo "use o agente michael para..." ou abra a sessão com `claude --agent manada:michael`.
- **Comandos:**
  - `/manada:eu` quem você é para a memória: nome, área, o que lê e onde grava.
  - `/manada:teto` quanto falta do seu teto de IA hoje e na semana, e da conta Claude da empresa. Não gasta cota.
  - `/manada:lembrar <texto>` grava um fato na memória da empresa na hora.

## Desligar a memória numa sessão

Abra o Claude Code com a variável `MANADA_MEMORIA=off`:

- Mac e Linux: `MANADA_MEMORIA=off claude`
- Windows (PowerShell): `$env:MANADA_MEMORIA="off"; claude`

Nessa sessão nada é buscado nem gravado. Os comandos continuam funcionando.

## Se o porteiro cair

O Claude Code segue normal, só sem memória naquela mensagem. Nenhum erro aparece para você.

## Atualizar

```
claude plugin marketplace update unnisend
claude plugin update manada@unnisend
```

Depois feche e abra o Claude Code.

## O que NÃO tem aqui (só no Hermes)

- Trocar de agente no meio da conversa com `/michael`, `/jim` etc.
- Skills e plugins exclusivos do Hermes (transcrição, kit Torriani, atualizador do perfil).
- Ferramentas de marketing (repositório Torriani, geração de imagem): o porteiro só libera para marketing e OPS.
- Controle remoto (`/rc`) do Claude Code: exige login da assinatura e não funciona com a chave do OmniRoute.

## Requisitos

- Claude Code com `ANTHROPIC_BASE_URL=https://omniroute.unnichat.com.br` e `ANTHROPIC_AUTH_TOKEN` com a sua chave pessoal.
- **Git** instalado. Sem ele o `claude plugin marketplace add` falha com "Command 'git' not found".
- **Node 18 ou mais novo.** Quem instalou o Claude Code pelo instalador oficial (`install.ps1` / `install.cmd` / `install.sh`) normalmente NÃO tem Node: sem ele o plugin instala, mas a memória e os comandos não funcionam (nenhum erro aparece, só não fazem nada). Confira com `node --version`.

### Windows

- Git: https://git-scm.com/download/win (instalação padrão).
- Node: https://nodejs.org (versão LTS, instalação padrão). Feche e abra o terminal depois.
- Testado no Windows 11 com o instalador oficial do Claude Code, Git e Node instalados depois.

Se a chave estiver apontando para outro lugar (Anthropic direto, outro provedor), o plugin não manda nada para lugar nenhum.

Dúvidas: fale com o Israel.
