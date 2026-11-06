// Contas, relatórios e a sugestão de investimento. Tudo em centavos.

import { TIPOS_CONTA, type Conta, type DadosDoMes, type TipoConta } from "./financas";

export type Categoria = TipoConta | "Sem tipo";
export const CATEGORIAS: readonly Categoria[] = [...TIPOS_CONTA, "Sem tipo"];

export const categoriaDe = (conta: Conta): Categoria => conta.tipo ?? "Sem tipo";

export const salarioDe = (dados: DadosDoMes) =>
  dados.recebimentos.quintoDiaUtil + dados.recebimentos.dia20;

export const somar = (contas: readonly Conta[]) =>
  contas.reduce((soma, conta) => soma + conta.centavos, 0);

export type Fatia = { categoria: Categoria; centavos: number; quantidade: number };

// Sempre na ordem fixa das categorias (a cor acompanha a categoria, não a posição).
export function porCategoria(contas: readonly Conta[]): Fatia[] {
  return CATEGORIAS.map((categoria) => {
    const daCategoria = contas.filter((conta) => categoriaDe(conta) === categoria);
    return { categoria, centavos: somar(daCategoria), quantidade: daCategoria.length };
  }).filter((fatia) => fatia.quantidade > 0);
}

const nomeNormalizado = (conta: Conta) => conta.descricao.trim().toLocaleLowerCase("pt-BR");

// O que passa de um mês para o seguinte ao copiar: parcelas ficam de fora (cada
// uma já foi lançada no seu mês) e também o que o destino já tem com o mesmo
// nome e tipo, como o cartão com valor lançado para os próximos meses.
export function contasParaCopiar(origem: readonly Conta[], destino: readonly Conta[]) {
  const existentes = new Set(destino.map((conta) => `${nomeNormalizado(conta)}|${conta.tipo}`));
  return origem.filter(
    (conta) => !conta.parcela && !existentes.has(`${nomeNormalizado(conta)}|${conta.tipo}`),
  );
}

export type Grupo = { nome: string; centavos: number; partes: Fatia[] };

// Contas com o mesmo nome (ex.: cartão e empréstimo do Itaú) somadas, maior primeiro.
export function porNome(contas: readonly Conta[]): Grupo[] {
  const grupos = new Map<string, Conta[]>();
  for (const conta of contas) {
    const chave = nomeNormalizado(conta);
    grupos.set(chave, [...(grupos.get(chave) ?? []), conta]);
  }
  return [...grupos.values()]
    .map((doGrupo) => ({
      nome: doGrupo[0].descricao.trim(),
      centavos: somar(doGrupo),
      partes: porCategoria(doGrupo),
    }))
    .sort((a, b) => b.centavos - a.centavos);
}

export type Saude = "saudavel" | "atencao" | "critico";

// Referência da regra 50/30/20: contas fixas em até metade do salário.
export function saudeDoComprometimento(fracao: number): Saude {
  if (fracao <= 0.5) return "saudavel";
  if (fracao <= 0.7) return "atencao";
  return "critico";
}

// Teto usual para parcelas de empréstimo em relação à renda.
export const LIMITE_EMPRESTIMOS = 0.3;
export const META_INVESTIMENTO = 0.2; // os "20" da regra 50/30/20
export const MESES_RESERVA = 6;

const PASSO = 5000; // R$ 50: a sugestão é um valor redondo, não uma conta exata
export const arredondar = (centavos: number) =>
  Math.max(0, Math.floor(centavos / PASSO) * PASSO);

export type Sugestao = {
  salario: number;
  contas: number;
  sobra: number;
  diaADia: number;
  disponivel: number;
  sugestao: number;
  metaReserva: number;
  mesesAteReserva: number | null;
};

export function sugerirInvestimento(dados: DadosDoMes): Sugestao {
  const salario = salarioDe(dados);
  const contas = somar(dados.contas);
  const sobra = salario - contas;
  const livre = Math.max(0, sobra);
  // Sem ajuste, metade da sobra fica para mercado, transporte e lazer,
  // que não aparecem na lista de contas.
  const diaADia = Math.min(livre, dados.planejamento.diaADia ?? arredondar(livre / 2));
  const disponivel = livre - diaADia;
  const sugestao = arredondar(disponivel);
  const metaReserva = MESES_RESERVA * (contas + diaADia);
  return {
    salario,
    contas,
    sobra,
    diaADia,
    disponivel,
    sugestao,
    metaReserva,
    mesesAteReserva: mesesAte(metaReserva, sugestao, dados.planejamento.rendimentoAnual),
  };
}

export const taxaMensal = (rendimentoAnual: number) =>
  (1 + rendimentoAnual / 100) ** (1 / 12) - 1;

export type Ponto = { mes: number; aportado: number; total: number };

// Aporte no fim de cada mês, juros compostos mensais.
export function projetar(aporte: number, rendimentoAnual: number, meses: number): Ponto[] {
  const taxa = taxaMensal(rendimentoAnual);
  const pontos: Ponto[] = [{ mes: 0, aportado: 0, total: 0 }];
  let total = 0;
  for (let mes = 1; mes <= meses; mes++) {
    total = total * (1 + taxa) + aporte;
    pontos.push({ mes, aportado: aporte * mes, total: Math.round(total) });
  }
  return pontos;
}

export function mesesAte(meta: number, aporte: number, rendimentoAnual: number) {
  if (meta <= 0) return 0;
  if (aporte <= 0) return null;
  const taxa = taxaMensal(rendimentoAnual);
  let total = 0;
  for (let mes = 1; mes <= 600; mes++) {
    total = total * (1 + taxa) + aporte;
    if (total >= meta) return mes;
  }
  return null;
}
