"use client";

import { useState, type ReactNode } from "react";
import { Info, Landmark, OctagonAlert, PiggyBank, ShieldCheck, Target, type LucideIcon } from "lucide-react";
import { ajustarPlanejamento } from "@/lib/cliente";
import {
  MESES_RESERVA,
  META_INVESTIMENTO,
  projetar,
  somar,
  sugerirInvestimento,
  type Ponto,
} from "@/lib/calculos";
import { formatar, formatarCompacto, formatarPercentual, mesPorExtenso, type DadosDoMes } from "@/lib/financas";
import { MODOS } from "./Relatorios";
import { Alternador, Dinheiro, estilo, TituloSecao, useLargura } from "./ui";

const HORIZONTES = [
  { valor: "12", texto: "1 ano" },
  { valor: "36", texto: "3 anos" },
  { valor: "60", texto: "5 anos" },
  { valor: "120", texto: "10 anos" },
] as const;
type Horizonte = (typeof HORIZONTES)[number]["valor"];

const dataDaqui = (meses: number) => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + meses, 1);
};
const mesEAno = (data: Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(data);

function periodo(meses: number) {
  if (meses === 0) return "hoje";
  if (meses % 12 === 0) return meses === 12 ? "1 ano" : `${meses / 12} anos`;
  return `${meses} meses`;
}

export function Investir({ dados }: { dados: DadosDoMes }) {
  const [horizonte, setHorizonte] = useState<Horizonte>("36");
  const [modo, setModo] = useState<"grafico" | "tabela">("grafico");
  const s = sugerirInvestimento(dados);
  const { planejamento } = dados;
  const livre = Math.max(0, s.sobra);
  const pontos = projetar(s.sugestao, planejamento.rendimentoAnual, Number(horizonte));
  const final = pontos[pontos.length - 1];
  const emprestimos = somar(dados.contas.filter((conta) => conta.tipo === "Empréstimo"));
  const fracao = s.salario ? s.sugestao / s.salario : 0;

  const titulo = (
    <TituloSecao
      icone={PiggyBank}
      titulo="Quanto investir"
      descricao={`Uma sugestão a partir do que sobra em ${mesPorExtenso(dados.mes)}`}
    />
  );

  if (s.salario === 0) {
    return (
      <>
        {titulo}
        <p className={`${estilo.cartao} px-5 py-10 text-center text-sm text-tinta-3`}>
          Informe seus recebimentos lá em cima para calcular quanto dá para investir.
        </p>
      </>
    );
  }

  return (
    <>
      {titulo}
      <div className={`${estilo.cartao} grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]`}>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium text-tinta-2">Sugestão para investir</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <Dinheiro centavos={s.sugestao} className="text-4xl font-semibold tracking-tight sm:text-5xl" />
              <span className="text-tinta-3">/mês</span>
            </p>
            <MedidorMeta fracao={fracao} salario={s.salario} />
          </div>

          {s.sobra <= 0 ? (
            <p className="flex gap-2.5 rounded-xl bg-critico/10 p-4 text-sm text-tinta-2">
              <OctagonAlert className="mt-0.5 size-4 shrink-0 text-critico" />
              <span>
                {s.sobra < 0
                  ? `As contas passam do salário em ${formatar(-s.sobra)}.`
                  : "As contas consomem todo o salário."}{" "}
                Antes de investir, o foco é equilibrar o mês: renegociar dívidas ou cortar custos.
              </span>
            </p>
          ) : (
            <>
              <dl className="flex flex-col gap-2 text-sm">
                <Linha rotulo="Sobra depois das contas" valor={formatar(s.sobra)} />
                <Linha rotulo="Reservado para o dia a dia" valor={`− ${formatar(s.diaADia)}`} />
                <Linha rotulo="Disponível" valor={formatar(s.disponivel)} destaque />
                <p className="text-xs text-tinta-3">A sugestão arredonda o disponível para baixo, de R$ 50 em R$ 50.</p>
              </dl>

              <Controle
                rotulo="Gastos do dia a dia"
                ajuda="Mercado, transporte, lazer: o que não está na lista de contas"
                valor={formatar(s.diaADia)}
              >
                <input
                  type="range"
                  aria-label="Gastos do dia a dia"
                  min={0}
                  max={livre}
                  step={5000}
                  value={s.diaADia}
                  onChange={(e) => ajustarPlanejamento({ ...planejamento, diaADia: Number(e.target.value) })}
                  className="w-full accent-acento"
                />
              </Controle>
            </>
          )}

          <Controle
            rotulo="Rendimento estimado"
            ajuda="Ao ano, já descontado o imposto"
            valor={`${planejamento.rendimentoAnual.toLocaleString("pt-BR")}% a.a.`}
          >
            <input
              type="range"
              aria-label="Rendimento estimado ao ano"
              min={0}
              max={20}
              step={0.5}
              value={planejamento.rendimentoAnual}
              onChange={(e) => ajustarPlanejamento({ ...planejamento, rendimentoAnual: Number(e.target.value) })}
              className="w-full accent-acento"
            />
          </Controle>

          <div className="rounded-xl bg-plano p-4 text-sm text-tinta-2">
            <p className="flex items-center gap-2 font-medium text-tinta">
              <ShieldCheck className="size-4 text-acento" />
              Reserva de emergência
            </p>
            <p className="mt-1.5">
              Meta de <strong className="text-tinta">{formatar(s.metaReserva)}</strong>: {MESES_RESERVA} meses do seu
              custo de vida (contas + dia a dia).
            </p>
            <p className="mt-1">
              {s.mesesAteReserva ? (
                <>
                  Investindo {formatar(s.sugestao)} por mês, você chega lá em{" "}
                  <strong className="text-tinta">
                    {s.mesesAteReserva} {s.mesesAteReserva === 1 ? "mês" : "meses"}
                  </strong>{" "}
                  ({mesEAno(dataDaqui(s.mesesAteReserva))}).
                </>
              ) : (
                "Com a sugestão em zero, a reserva não avança."
              )}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Projeção</h3>
              <p className="text-sm text-tinta-3">
                {formatar(s.sugestao)} todo mês a {planejamento.rendimentoAnual.toLocaleString("pt-BR")}% ao ano
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Alternador rotulo="Período" valor={horizonte} aoMudar={setHorizonte} opcoes={HORIZONTES} />
              <Alternador rotulo="Exibição" valor={modo} aoMudar={setModo} opcoes={MODOS} />
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-acento" />
              Com rendimento
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-tinta-3" />
              Só o que você investiu
            </li>
          </ul>

          {s.sugestao === 0 ? (
            <p className="grid h-[260px] place-items-center rounded-xl bg-plano px-6 text-center text-sm text-tinta-3">
              Sem valor para investir, não há projeção. Ajuste os gastos do dia a dia ou as contas.
            </p>
          ) : modo === "grafico" ? (
            <GraficoProjecao pontos={pontos} meta={s.metaReserva} />
          ) : (
            <TabelaProjecao pontos={pontos} />
          )}

          <div className="grid grid-cols-3 gap-3 border-t border-linha pt-4">
            <Resumo rotulo="Você investe" valor={final.aportado} />
            <Resumo rotulo="Rendimento" valor={final.total - final.aportado} />
            <Resumo rotulo={`Total em ${periodo(final.mes)}`} valor={final.total} destaque />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {emprestimos > 0 && (
          <Dica icone={Landmark} titulo="Empréstimos primeiro">
            Você paga {formatar(emprestimos)} por mês em empréstimos. Antecipar parcelas costuma economizar mais juros
            do que uma aplicação conservadora rende.
          </Dica>
        )}
        <Dica icone={ShieldCheck} titulo="Reserva antes de risco">
          Enquanto a reserva não estiver completa, prefira aplicações de baixo risco e resgate imediato, como Tesouro
          Selic ou CDB com liquidez diária.
        </Dica>
        <Dica icone={Target} titulo="Regra 50/30/20">
          Até 50% do salário em contas fixas, 30% no dia a dia e {formatarPercentual(META_INVESTIMENTO)} investido.
          Hoje suas contas levam {formatarPercentual(s.contas / s.salario)}.
        </Dica>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-tinta-3">
        <Info className="size-3.5 shrink-0" />
        Estimativa simples para planejamento pessoal, não é recomendação de investimento. Rendimentos variam.
      </p>
    </>
  );
}

function MedidorMeta({ fracao, salario }: { fracao: number; salario: number }) {
  const escala = META_INVESTIMENTO * 1.5; // a meta fica a dois terços do medidor
  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-[4px] bg-acento/15">
        <div
          className="h-full rounded-r-[4px] bg-acento transition-[width] duration-500"
          style={{ width: `${Math.min(fracao / escala, 1) * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-tinta"
          style={{ left: `${(META_INVESTIMENTO / escala) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-tinta-2">
        <strong className="font-medium text-tinta">{formatarPercentual(fracao)}</strong> do salário · meta de{" "}
        {formatarPercentual(META_INVESTIMENTO)} ({formatar(salario * META_INVESTIMENTO)})
      </p>
    </div>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${destaque ? "border-t border-linha pt-2 font-medium text-tinta" : "text-tinta-2"}`}>
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}

function Controle({
  rotulo,
  ajuda,
  valor,
  children,
}: {
  rotulo: string;
  ajuda: string;
  valor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{rotulo}</span>
        <span className="text-sm font-semibold tabular-nums">{valor}</span>
      </div>
      <p className="mb-2 text-xs text-tinta-3">{ajuda}</p>
      {children}
    </div>
  );
}

function Resumo({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-tinta-3">{rotulo}</p>
      <Dinheiro
        centavos={valor}
        className={`block truncate font-semibold tracking-tight ${destaque ? "text-lg sm:text-xl" : "text-base sm:text-lg"}`}
      />
    </div>
  );
}

function Dica({ icone: Icone, titulo, children }: { icone: LucideIcon; titulo: string; children: ReactNode }) {
  return (
    <div className={`${estilo.cartao} p-4 text-sm text-tinta-2`}>
      <p className="mb-1.5 flex items-center gap-2 font-medium text-tinta">
        <Icone className="size-4 text-acento" />
        {titulo}
      </p>
      {children}
    </div>
  );
}

// ---- Gráfico de projeção (SVG desenhado na largura real do cartão) ----

const ALTURA = 260;
const MARGEM = { topo: 16, direita: 12, base: 28, esquerda: 76 }; // cabe "R$ 150 mil"

// Divisões "redondas" do eixo vertical: 0, 20 mil, 40 mil...
function marcasY(maximo: number) {
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const marcas = [0];
  while (marcas[marcas.length - 1] < maximo) marcas.push(marcas[marcas.length - 1] + passo);
  return marcas;
}

function marcasX(meses: number) {
  const passo = meses <= 12 ? 3 : meses <= 60 ? 12 : 24;
  return Array.from({ length: meses / passo + 1 }, (_, i) => i * passo);
}

// Transição suave do traçado quando os valores mudam (onde o navegador suporta).
const morfar = (d: string) => ({ d: `path("${d}")`, transition: "d 500ms ease" }) as React.CSSProperties;

function GraficoProjecao({ pontos, meta }: { pontos: Ponto[]; meta: number }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [indice, setIndice] = useState<number | null>(null);
  const n = pontos.length - 1;
  const marcas = marcasY(Math.max(...pontos.map((p) => p.total), 1));
  const topo = marcas[marcas.length - 1];
  const larguraPlot = Math.max(1, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = ALTURA - MARGEM.topo - MARGEM.base;
  const x = (mes: number) => MARGEM.esquerda + (mes / n) * larguraPlot;
  const y = (valor: number) => MARGEM.topo + alturaPlot - (valor / topo) * alturaPlot;
  const traco = (campo: "total" | "aportado") =>
    pontos.map((p, i) => `${i ? "L" : "M"}${x(p.mes).toFixed(1)},${y(p[campo]).toFixed(1)}`).join("");
  const area = `${traco("total")}L${x(n)},${y(0)}L${x(0)},${y(0)}Z`;
  const ativo = indice === null ? null : pontos[indice];
  const ultimo = pontos[n];

  function aoMover(e: React.PointerEvent<SVGSVGElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();
    const mes = Math.round(((e.clientX - caixa.left - MARGEM.esquerda) / larguraPlot) * n);
    setIndice(Math.max(0, Math.min(n, mes)));
  }

  function aoTeclar(e: React.KeyboardEvent) {
    const passos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageDown: -12, PageUp: 12 };
    if (e.key in passos) {
      e.preventDefault();
      setIndice((atual) => Math.max(0, Math.min(n, (atual ?? n) + passos[e.key])));
    }
  }

  return (
    <div ref={ref} className="relative" style={{ height: ALTURA }}>
      {largura > 0 && (
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          tabIndex={0}
          aria-label={`Projeção: em ${periodo(n)}, ${formatar(ultimo.total)} com rendimento, sendo ${formatar(ultimo.aportado)} investidos. Use as setas para percorrer os meses.`}
          onPointerMove={aoMover}
          onPointerLeave={() => setIndice(null)}
          onFocus={() => setIndice(n)}
          onBlur={() => setIndice(null)}
          onKeyDown={aoTeclar}
          className="touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-acento/40"
        >
          {marcas.map((valor) => (
            <g key={valor}>
              <line
                x1={MARGEM.esquerda}
                x2={largura - MARGEM.direita}
                y1={y(valor)}
                y2={y(valor)}
                stroke={valor === 0 ? "var(--eixo)" : "var(--grade)"}
              />
              <text x={MARGEM.esquerda - 8} y={y(valor)} dy="0.32em" textAnchor="end" className="fill-tinta-3 text-[11px] tabular-nums">
                {formatarCompacto(valor)}
              </text>
            </g>
          ))}
          {marcasX(n).map((mes) => (
            <text
              key={mes}
              x={x(mes)}
              y={ALTURA - 8}
              textAnchor={mes === 0 ? "start" : mes === n ? "end" : "middle"}
              className="fill-tinta-3 text-[11px]"
            >
              {periodo(mes)}
            </text>
          ))}

          {meta > 0 && meta <= topo && (
            <g>
              <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(meta)} y2={y(meta)} stroke="var(--tinta-3)" />
              <text x={MARGEM.esquerda + 6} y={y(meta) - 6} className="fill-tinta-2 text-[11px]">
                Reserva de emergência · {formatarCompacto(meta)}
              </text>
            </g>
          )}

          <path d={area} style={morfar(area)} fill="var(--acento)" fillOpacity={0.1} />
          <path d={traco("aportado")} style={morfar(traco("aportado"))} fill="none" stroke="var(--tinta-3)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={traco("total")} style={morfar(traco("total"))} fill="none" stroke="var(--acento)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {ativo && (
            <line x1={x(ativo.mes)} x2={x(ativo.mes)} y1={MARGEM.topo} y2={y(0)} stroke="var(--tinta-3)" />
          )}
          {[
            { valor: (ativo ?? ultimo).aportado, cor: "var(--tinta-3)" },
            { valor: (ativo ?? ultimo).total, cor: "var(--acento)" },
          ].map(({ valor, cor }) => (
            <circle
              key={cor}
              cx={x((ativo ?? ultimo).mes)}
              cy={y(valor)}
              r={4.5}
              fill={cor}
              stroke="var(--superficie)"
              strokeWidth={2}
            />
          ))}
        </svg>
      )}

      {ativo && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max rounded-lg border border-linha bg-superficie px-3 py-2 text-sm shadow-xl shadow-black/10"
          style={{
            left: x(ativo.mes),
            transform: x(ativo.mes) > largura * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="text-xs text-tinta-3">
            {mesEAno(dataDaqui(ativo.mes))} · {periodo(ativo.mes)}
          </p>
          <p className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full bg-acento" />
            <strong className="tabular-nums">{formatar(ativo.total)}</strong>
            <span className="text-tinta-3">com rendimento</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full bg-tinta-3" />
            <strong className="tabular-nums">{formatar(ativo.aportado)}</strong>
            <span className="text-tinta-3">investido</span>
          </p>
        </div>
      )}
    </div>
  );
}

function TabelaProjecao({ pontos }: { pontos: Ponto[] }) {
  const linhas = marcasX(pontos.length - 1).slice(1).map((mes) => pontos[mes]);
  return (
    <div className="min-h-[260px] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-linha text-tinta-3">
            <th className="py-2 pr-3 text-left font-normal">Quando</th>
            <th className="px-3 py-2 text-right font-normal">Investido</th>
            <th className="px-3 py-2 text-right font-normal">Rendimento</th>
            <th className="py-2 pl-3 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linha">
          {linhas.map((ponto) => (
            <tr key={ponto.mes}>
              <td className="py-2 pr-3">
                {periodo(ponto.mes)} <span className="text-tinta-3">({mesEAno(dataDaqui(ponto.mes))})</span>
              </td>
              <td className="px-3 py-2 text-right text-tinta-2 tabular-nums">{formatar(ponto.aportado)}</td>
              <td className="px-3 py-2 text-right text-tinta-2 tabular-nums">{formatar(ponto.total - ponto.aportado)}</td>
              <td className="py-2 pl-3 text-right font-medium tabular-nums">{formatar(ponto.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
