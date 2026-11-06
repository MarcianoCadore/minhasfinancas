// Tipos e formatação usados tanto no navegador quanto no servidor.

export const TIPOS_CONTA = [
  "Cartão de crédito",
  "Boleto",
  "Empréstimo",
  "Contas da casa",
] as const;
export type TipoConta = (typeof TIPOS_CONTA)[number];

export type Conta = {
  id: string;
  mes: string; // mês de referência, "AAAA-MM"
  descricao: string;
  tipo: TipoConta | null; // null: contas cadastradas antes do campo existir
  centavos: number;
  paga: boolean;
  criadaEm: string; // ISO 8601
  // Contas lançadas juntas para vários meses (parcelas, valores futuros do cartão).
  grupo: string | null;
  parcela: { atual: number; total: number } | null;
};

// O salário é a soma dos dois recebimentos do mês (em centavos).
export type Recebimentos = { quintoDiaUtil: number; dia20: number };

// Ajustes da sugestão de investimento. diaADia null = o usuário ainda não mexeu.
export type Planejamento = { diaADia: number | null; rendimentoAnual: number };

// Tudo o que o usuário logado tem no banco: contas e recebimentos de todos os meses.
export type Dados = {
  usuario: string;
  contas: Conta[];
  recebimentos: Record<string, Recebimentos>; // por mês "AAAA-MM"
  planejamento: Planejamento;
};

// O que a tela mostra: um mês por vez.
export type DadosDoMes = {
  mes: string;
  contas: Conta[];
  recebimentos: Recebimentos;
  planejamento: Planejamento;
};

export const RECEBIMENTOS_VAZIOS: Recebimentos = { quintoDiaUtil: 0, dia20: 0 };
export const PLANEJAMENTO_PADRAO: Planejamento = { diaADia: null, rendimentoAnual: 10 };

export function doMes(dados: Dados, mes: string): DadosDoMes {
  return {
    mes,
    contas: dados.contas.filter((conta) => conta.mes === mes),
    recebimentos: dados.recebimentos[mes] ?? RECEBIMENTOS_VAZIOS,
    planejamento: dados.planejamento,
  };
}

export const mesDe = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

export function somarMeses(mes: string, quantidade: number) {
  const [ano, numero] = mes.split("-").map(Number);
  return mesDe(new Date(ano, numero - 1 + quantidade, 1));
}

const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

// "2026-12" -> "dezembro de 2026" (para o meio de frases)
export function mesPorExtenso(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  return nomeMes.format(new Date(ano, numero - 1, 1));
}

const mesAbreviado = new Intl.DateTimeFormat("pt-BR", { month: "short" });

// "2026-12" -> "dez/2026" (para listas e campos estreitos)
export function mesCurto(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  return `${mesAbreviado.format(new Date(ano, numero - 1, 1)).replace(".", "")}/${ano}`;
}

// "2026-12" -> "Dezembro de 2026" (para títulos)
export function nomeDoMes(mes: string) {
  const nome = mesPorExtenso(mes);
  return nome[0].toUpperCase() + nome.slice(1);
}

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numeroCampo = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatar(centavos: number) {
  return moeda.format(centavos / 100);
}

// Para eixos e espaços curtos: "R$ 23,5 mil".
export function formatarCompacto(centavos: number) {
  return moedaCompacta.format(centavos / 100);
}

export function formatarPercentual(fracao: number) {
  return percentual.format(fracao);
}

// Texto para preencher um campo de valor: 500000 -> "5.000,00"; zero -> vazio.
export function paraCampo(centavos: number) {
  return centavos ? numeroCampo.format(centavos / 100) : "";
}

// Aceita "1.234,56", "1234,56", "1234.56", "1.234" e "R$ 50".
// Devolve centavos, ou null se o texto não for um valor.
export function paraCentavos(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, "");
  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(\.|$)/.test(limpo)) {
    limpo = limpo.replace(/\./g, ""); // ponto como separador de milhar
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}
