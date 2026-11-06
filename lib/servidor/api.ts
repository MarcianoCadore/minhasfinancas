import "server-only";
import { connection } from "next/server";
import { TIPOS_CONTA, type Conta, type TipoConta } from "@/lib/financas";
import type { Usuario } from "./banco";
import { usuarioAtual } from "./sessao";

export class ErroValidacao extends Error {}

// Rotas de dados: exigem login e recebem o usuário, para só mexer no que é dele.
export async function rota(acao: (usuario: Usuario) => Response | Promise<Response>) {
  await connection(); // o SQLite é síncrono; sem isto o GET seria pré-renderizado no build
  const usuario = await usuarioAtual();
  if (!usuario) {
    return Response.json({ erro: "Entre com seu usuário e senha." }, { status: 401 });
  }
  return executar(() => acao(usuario));
}

// Rotas de login e cadastro, que funcionam sem estar logado.
export async function rotaAberta(acao: () => Response | Promise<Response>) {
  await connection();
  return executar(acao);
}

// Nunca guardada em cache; erros viram JSON.
async function executar(acao: () => Response | Promise<Response>) {
  try {
    const resposta = await acao();
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  } catch (erro) {
    if (erro instanceof ErroValidacao) {
      return Response.json({ erro: erro.message }, { status: 400 });
    }
    console.error(erro);
    return Response.json({ erro: "Erro interno ao acessar o banco." }, { status: 500 });
  }
}

export async function lerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroValidacao("Corpo da requisição inválido.");
  }
}

export function objeto(valor: unknown): Record<string, unknown> {
  if (typeof valor === "object" && valor !== null && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }
  throw new ErroValidacao("Dados inválidos.");
}

const MAXIMO = 10_000_000_000; // R$ 100 milhões, em centavos

export function centavos(valor: unknown, { zeroPermitido = false } = {}) {
  if (
    typeof valor !== "number" ||
    !Number.isInteger(valor) ||
    valor < 0 ||
    valor > MAXIMO ||
    (valor === 0 && !zeroPermitido)
  ) {
    throw new ErroValidacao("Valor inválido.");
  }
  return valor;
}

export function descricao(valor: unknown) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto || texto.length > 80) throw new ErroValidacao("Descrição inválida.");
  return texto;
}

export function tipo(valor: unknown): TipoConta | null {
  if (valor === null) return null;
  if ((TIPOS_CONTA as readonly unknown[]).includes(valor)) return valor as TipoConta;
  throw new ErroValidacao("Tipo de conta inválido.");
}

// Sem acento e sem espaço, guardado em minúsculas: "Stefani" e "stefani" são o mesmo.
export function nomeDeUsuario(valor: unknown) {
  const texto = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,30}$/.test(texto)) {
    throw new ErroValidacao("Use de 3 a 30 letras sem acento, números, ponto, hífen ou sublinhado.");
  }
  return texto;
}

export function senha(valor: unknown) {
  if (typeof valor !== "string" || valor.length < 6 || valor.length > 200) {
    throw new ErroValidacao("A senha precisa ter pelo menos 6 caracteres.");
  }
  return valor;
}

export function mes(valor: unknown) {
  if (typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return valor;
  throw new ErroValidacao("Mês inválido.");
}

export function booleano(valor: unknown) {
  if (typeof valor !== "boolean") throw new ErroValidacao("Valor inválido.");
  return valor;
}

export function identificador(valor: unknown) {
  if (typeof valor === "string" && /^[a-z0-9-]{6,64}$/i.test(valor)) return valor;
  throw new ErroValidacao("Identificador inválido.");
}

const MAXIMO_PARCELAS = 480; // financiamento imobiliário de até 40 anos

function parcela(valor: unknown): Conta["parcela"] {
  if (valor === null || valor === undefined) return null;
  const { atual, total } = objeto(valor);
  if (
    !Number.isInteger(atual) ||
    !Number.isInteger(total) ||
    (atual as number) < 1 ||
    (atual as number) > (total as number) ||
    (total as number) > MAXIMO_PARCELAS
  ) {
    throw new ErroValidacao(`Parcela inválida: use de 1 até ${MAXIMO_PARCELAS}, e a atual não pode passar do total.`);
  }
  return { atual: atual as number, total: total as number };
}

export function conta(valor: unknown): Conta {
  const dados = objeto(valor);
  const criadaEm = dados.criadaEm === undefined ? Date.now() : Date.parse(String(dados.criadaEm));
  if (Number.isNaN(criadaEm)) throw new ErroValidacao("Data inválida.");
  return {
    id: identificador(dados.id),
    mes: mes(dados.mes),
    descricao: descricao(dados.descricao),
    tipo: tipo(dados.tipo ?? null),
    centavos: centavos(dados.centavos),
    paga: dados.paga === undefined ? false : booleano(dados.paga),
    criadaEm: new Date(criadaEm).toISOString(),
    grupo: dados.grupo === null || dados.grupo === undefined ? null : identificador(dados.grupo),
    parcela: parcela(dados.parcela),
  };
}

// Uma ou várias contas lançadas juntas (uma série cabe numa chamada só).
export function contas(valor: unknown): Conta[] {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > MAXIMO_PARCELAS) {
    throw new ErroValidacao("Lista de contas inválida.");
  }
  return valor.map(conta);
}
