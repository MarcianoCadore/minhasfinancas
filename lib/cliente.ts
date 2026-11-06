// Estado da tela no navegador, sincronizado com a API (o banco fica na VM).

import { useSyncExternalStore } from "react";
import {
  mesDe,
  mesPorExtenso,
  somarMeses,
  type Conta,
  type Dados,
  type Planejamento,
  type Recebimentos,
} from "./financas";

export type Estado =
  | { fase: "carregando" }
  | { fase: "login" }
  | { fase: "erro"; mensagem: string }
  | { fase: "pronto"; dados: Dados };

export type Acao = { texto: string; executar: () => void };
export type Aviso = { id: number; texto: string; erro?: boolean; acoes?: Acao[] };

function criarLoja<T>(inicial: T) {
  let valor = inicial;
  const ouvintes = new Set<() => void>();
  return {
    ler: () => valor,
    definir(novo: T) {
      valor = novo;
      ouvintes.forEach((avisar) => avisar());
    },
    assinar(ouvinte: () => void) {
      ouvintes.add(ouvinte);
      return () => void ouvintes.delete(ouvinte);
    },
  };
}

const estado = criarLoja<Estado>({ fase: "carregando" });
const avisos = criarLoja<Aviso[]>([]);

export const useEstado = () => useSyncExternalStore(estado.assinar, estado.ler, estado.ler);
export const useAvisos = () => useSyncExternalStore(avisos.assinar, avisos.ler, avisos.ler);

// ---- Mês exibido ----

const mesEscolhido = criarLoja<string | null>(null);
export const escolherMes = (mes: string) => mesEscolhido.definir(mes);

// Sem escolha do usuário, abre no primeiro mês a partir de hoje que tem
// algo cadastrado (as contas costumam ser lançadas antes do mês começar).
function mesInicial(dados: Dados) {
  const atual = mesDe(new Date());
  const meses = [...dados.contas.map((conta) => conta.mes), ...Object.keys(dados.recebimentos)];
  return meses.filter((mes) => mes >= atual).sort()[0] ?? atual;
}

// null enquanto os dados não carregaram.
export function useMes() {
  const escolhido = useSyncExternalStore(mesEscolhido.assinar, mesEscolhido.ler, mesEscolhido.ler);
  const atual = useEstado();
  if (atual.fase !== "pronto") return null;
  return escolhido ?? mesInicial(atual.dados);
}

let ultimoAviso = 0;
export function avisar(texto: string, opcoes: Omit<Aviso, "id" | "texto"> = {}) {
  const aviso = { id: ++ultimoAviso, texto, ...opcoes };
  avisos.definir([...avisos.ler(), aviso]);
  setTimeout(() => fecharAviso(aviso.id), 6000);
}
export function fecharAviso(id: number) {
  avisos.definir(avisos.ler().filter((aviso) => aviso.id !== id));
}

// ---- Comunicação com a API ----

class SemSessao extends Error {}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(caminho, {
    method: metodo,
    cache: "no-store",
    headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (resposta.status === 401) {
    estado.definir({ fase: "login" });
    throw new SemSessao();
  }
  if (!resposta.ok) {
    const { erro } = (await resposta.json().catch(() => ({}))) as { erro?: string };
    throw new Error(erro ?? `Erro ${resposta.status}.`);
  }
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}

const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : "");

// Alterações ainda a caminho do servidor: um recarregamento no meio delas
// traria o banco sem a mudança e apagaria o que a tela já mostra.
let pendentes = 0;

export async function carregar() {
  try {
    const dados = await chamar<Dados>("GET", "/api/dados");
    if (pendentes === 0) estado.definir({ fase: "pronto", dados });
  } catch (erro) {
    if (erro instanceof SemSessao) return;
    if (estado.ler().fase === "pronto") avisar(`Sem conexão com o servidor. ${mensagem(erro)}`, { erro: true });
    else estado.definir({ fase: "erro", mensagem: mensagem(erro) || "Falha ao carregar." });
  }
}

// ---- Login, cadastro e saída ----

// Devolve a mensagem de erro, ou null quando deu certo (e já carrega os dados).
async function acessar(caminho: string, usuario: string, senha: string): Promise<string | null> {
  const resposta = await fetch(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  }).catch(() => null);
  if (!resposta) return "Sem conexão com o servidor.";
  if (!resposta.ok) {
    const { erro } = (await resposta.json().catch(() => ({}))) as { erro?: string };
    return erro ?? "Não foi possível entrar.";
  }
  mesEscolhido.definir(null); // outro usuário pode ter usado este aparelho
  await carregar();
  return null;
}

export const entrar = (usuario: string, senha: string) => acessar("/api/sessao", usuario, senha);
export const cadastrar = (usuario: string, senha: string) => acessar("/api/usuarios", usuario, senha);

export async function sair() {
  await fetch("/api/sessao", { method: "DELETE" }).catch(() => null);
  avisos.definir([]);
  mesEscolhido.definir(null);
  estado.definir({ fase: "login" });
}

// ---- Alterações ----

// Mostra a mudança na hora e confirma no servidor; se ele recusar, volta ao que está no banco.
async function alterar(local: (dados: Dados) => Dados, remoto: () => Promise<unknown>) {
  const atual = estado.ler();
  if (atual.fase !== "pronto") return false;
  estado.definir({ fase: "pronto", dados: local(atual.dados) });
  pendentes++;
  try {
    await remoto();
    return true;
  } catch (erro) {
    if (!(erro instanceof SemSessao)) avisar(`Não foi possível salvar. ${mensagem(erro)}`, { erro: true });
    return false;
  } finally {
    pendentes--;
    if (pendentes === 0 && estado.ler().fase === "pronto") void carregar();
  }
}

const porCriacao = (a: Conta, b: Conta) => a.criadaEm.localeCompare(b.criadaEm);

// Uma conta ou uma série (parcelas, valores futuros do cartão), gravadas juntas.
export function adicionarContas(contas: Conta[]) {
  return alterar(
    (dados) => ({ ...dados, contas: [...dados.contas, ...contas] }),
    () => chamar("POST", "/api/contas", contas),
  );
}

const desfazerRemocao = (contas: Conta[]): Acao => ({
  texto: "Desfazer",
  executar: () =>
    void alterar(
      (dados) => ({ ...dados, contas: [...dados.contas, ...contas].sort(porCriacao) }),
      () => chamar("POST", "/api/contas", contas),
    ),
});

export function atualizarConta(
  id: string,
  campos: Partial<Pick<Conta, "descricao" | "tipo" | "centavos" | "paga">>,
) {
  return alterar(
    (dados) => ({
      ...dados,
      contas: dados.contas.map((conta) => (conta.id === id ? { ...conta, ...campos } : conta)),
    }),
    () => chamar("PATCH", `/api/contas/${id}`, campos),
  );
}

export async function removerConta(conta: Conta) {
  const atual = estado.ler();
  // Parcelas (ou valores futuros) da mesma série nos meses seguintes.
  const seguintes =
    atual.fase === "pronto" && conta.grupo
      ? atual.dados.contas.filter((c) => c.grupo === conta.grupo && c.mes > conta.mes)
      : [];
  const removida = await alterar(
    (dados) => ({ ...dados, contas: dados.contas.filter((c) => c.id !== conta.id) }),
    () => chamar("DELETE", `/api/contas/${conta.id}`),
  );
  if (!removida) return;
  const acoes = [desfazerRemocao([conta])];
  if (seguintes.length) {
    acoes.push({
      texto: `Remover as próximas (${seguintes.length})`,
      executar: () => void removerSeguintes(conta, seguintes),
    });
  }
  avisar(`“${conta.descricao}” removida de ${mesPorExtenso(conta.mes)}.`, { acoes });
}

async function removerSeguintes(conta: Conta, seguintes: Conta[]) {
  const ids = new Set(seguintes.map((c) => c.id));
  const removidas = await alterar(
    (dados) => ({ ...dados, contas: dados.contas.filter((c) => !ids.has(c.id)) }),
    () => chamar("DELETE", `/api/grupos/${conta.grupo}?desde=${somarMeses(conta.mes, 1)}`),
  );
  if (removidas) {
    // O aviso anterior (com o desfazer da primeira) já fechou: este desfaz a série toda.
    avisar(
      `“${conta.descricao}” removida de ${mesPorExtenso(conta.mes)} e dos ${seguintes.length} meses seguintes.`,
      { acoes: [desfazerRemocao([conta, ...seguintes])] },
    );
  }
}

// Leva para "para" as contas que se repetem de "de" (todas a pagar) e abre o mês.
export async function copiarMes(de: string, para: string) {
  try {
    const copiado = await chamar<{ contas: number }>("POST", "/api/meses/copiar", { de, para });
    await carregar();
    escolherMes(para);
    avisar(`${copiado.contas} ${copiado.contas === 1 ? "conta copiada" : "contas copiadas"} de ${mesPorExtenso(de)} para ${mesPorExtenso(para)}.`);
  } catch (erro) {
    if (!(erro instanceof SemSessao)) avisar(`Não foi possível copiar. ${mensagem(erro)}`, { erro: true });
  }
}

export function salvarRecebimentos(mes: string, recebimentos: Recebimentos) {
  return alterar(
    (dados) => ({ ...dados, recebimentos: { ...dados.recebimentos, [mes]: recebimentos } }),
    () => chamar("PUT", "/api/recebimentos", { mes, ...recebimentos }),
  );
}

// Os controles deslizantes mudam o valor várias vezes por segundo:
// a tela acompanha na hora e o servidor só recebe o valor final.
let temporizador: ReturnType<typeof setTimeout> | undefined;
export function ajustarPlanejamento(planejamento: Planejamento) {
  const atual = estado.ler();
  if (atual.fase !== "pronto") return;
  estado.definir({ fase: "pronto", dados: { ...atual.dados, planejamento } });
  clearTimeout(temporizador);
  temporizador = setTimeout(
    () => void alterar((dados) => dados, () => chamar("PUT", "/api/planejamento", planejamento)),
    500,
  );
}
