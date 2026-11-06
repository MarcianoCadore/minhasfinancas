"use client";

import { useState } from "react";
import { ChartColumn, CircleCheck, Lightbulb, Table, TriangleAlert, type LucideIcon } from "lucide-react";
import {
  LIMITE_EMPRESTIMOS,
  porCategoria,
  porNome,
  salarioDe,
  somar,
  type Categoria,
} from "@/lib/calculos";
import { formatar, formatarPercentual, mesPorExtenso, type Conta, type DadosDoMes } from "@/lib/financas";
import { COR, IconeCategoria } from "./categorias";
import { Alternador, DicaFlutuante, DicaValor, estilo, TituloSecao, useDica } from "./ui";

type Modo = "grafico" | "tabela";

export const MODOS = [
  { valor: "grafico", texto: <><ChartColumn className="size-4" />Gráfico</> },
  { valor: "tabela", texto: <><Table className="size-4" />Tabela</> },
] as const;

export function Relatorios({ dados }: { dados: DadosDoMes }) {
  return (
    <>
      <TituloSecao
        icone={ChartColumn}
        titulo="Relatórios"
        descricao={`Para onde vai o dinheiro em ${mesPorExtenso(dados.mes)}`}
      />
      {dados.contas.length === 0 ? (
        <p className={`${estilo.cartao} px-5 py-10 text-center text-sm text-tinta-3`}>
          Cadastre contas para ver os relatórios.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <PorNome contas={dados.contas} />
          <PorCategoria contas={dados.contas} salario={salarioDe(dados)} />
        </div>
      )}
    </>
  );
}

function Legenda({ categorias }: { categorias: Categoria[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta-2">
      {categorias.map((categoria) => (
        <li key={categoria} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: COR[categoria] }} />
          {categoria}
        </li>
      ))}
    </ul>
  );
}

function PorNome({ contas }: { contas: Conta[] }) {
  const [modo, setModo] = useState<Modo>("grafico");
  const { dica, mostrar, esconder } = useDica();
  const grupos = porNome(contas);
  const categorias = porCategoria(contas).map((fatia) => fatia.categoria);
  const maior = grupos[0]?.centavos || 1;

  return (
    <div className={`${estilo.cartao} p-5 sm:p-6 lg:col-span-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Total por nome</h3>
          <p className="text-sm text-tinta-3">
            Contas com o mesmo nome somadas, como cartão e empréstimo do mesmo banco
          </p>
        </div>
        <Alternador rotulo="Exibição" valor={modo} aoMudar={setModo} opcoes={MODOS} />
      </div>
      <Legenda categorias={categorias} />

      {modo === "grafico" ? (
        <ul className="mt-5 flex flex-col gap-3.5">
          {grupos.map((grupo) => (
            <li
              key={grupo.nome}
              className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto]"
            >
              <span className="truncate text-tinta-2" title={grupo.nome}>
                {grupo.nome}
              </span>
              <div
                className="flex h-3.5 gap-[2px] transition-[width] duration-500"
                style={{ width: `${(grupo.centavos / maior) * 100}%` }}
              >
                {grupo.partes.map((parte) => {
                  const conteudo = (
                    <DicaValor
                      titulo={`${grupo.nome} · ${parte.categoria}`}
                      cor={COR[parte.categoria]}
                      valor={formatar(parte.centavos)}
                      detalhe={`${formatarPercentual(parte.centavos / grupo.centavos)} do total de ${grupo.nome}`}
                    />
                  );
                  return (
                    <div
                      key={parte.categoria}
                      tabIndex={0}
                      aria-label={`${grupo.nome}, ${parte.categoria}: ${formatar(parte.centavos)}`}
                      onPointerMove={(e) => mostrar(e, conteudo)}
                      onPointerLeave={esconder}
                      onFocus={(e) => mostrar(e, conteudo)}
                      onBlur={esconder}
                      className="h-full min-w-[3px] outline-none last:rounded-r-[4px] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-acento"
                      style={{ flexGrow: parte.centavos, flexBasis: 0, background: COR[parte.categoria] }}
                    />
                  );
                })}
              </div>
              <span className="text-right font-medium tabular-nums">{formatar(grupo.centavos)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linha text-tinta-3">
                <th className="py-2 pr-3 text-left font-normal">Nome</th>
                {categorias.map((categoria) => (
                  <th key={categoria} className="px-3 py-2 text-right font-normal whitespace-nowrap">
                    {categoria}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {grupos.map((grupo) => (
                <tr key={grupo.nome}>
                  <td className="py-2 pr-3">{grupo.nome}</td>
                  {categorias.map((categoria) => {
                    const parte = grupo.partes.find((p) => p.categoria === categoria);
                    return (
                      <td key={categoria} className="px-3 py-2 text-right text-tinta-2 tabular-nums">
                        {parte ? formatar(parte.centavos) : "—"}
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right font-medium tabular-nums">{formatar(grupo.centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DicaFlutuante dica={dica} />
    </div>
  );
}

function PorCategoria({ contas, salario }: { contas: Conta[]; salario: number }) {
  const fatias = porCategoria(contas);
  const total = somar(contas);
  const emprestimos = fatias.find((fatia) => fatia.categoria === "Empréstimo")?.centavos ?? 0;
  const maiorConta = contas.reduce((maior, conta) => (conta.centavos > maior.centavos ? conta : maior));

  return (
    <div className={`${estilo.cartao} flex flex-col p-5 sm:p-6 lg:col-span-2`}>
      <h3 className="font-semibold">Por categoria</h3>
      <p className="text-sm text-tinta-3">Quanto cada tipo pesa no total de contas</p>

      <ul className="mt-5 flex flex-col gap-4">
        {fatias.map((fatia) => (
          <li key={fatia.categoria} className="flex items-center gap-3">
            <IconeCategoria categoria={fatia.categoria} pequeno />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{fatia.categoria}</span>
                <span className="font-medium tabular-nums">{formatar(fatia.centavos)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-[4px] bg-trilho">
                <div
                  className="h-full rounded-r-[4px] transition-[width] duration-500"
                  style={{ width: `${(fatia.centavos / total) * 100}%`, background: COR[fatia.categoria] }}
                />
              </div>
              <div className="mt-1 flex justify-between gap-2 text-xs text-tinta-3">
                <span>
                  {fatia.quantidade} {fatia.quantidade === 1 ? "conta" : "contas"}
                </span>
                <span>
                  {formatarPercentual(fatia.centavos / total)} das contas
                  {salario > 0 && ` · ${formatarPercentual(fatia.centavos / salario)} do salário`}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 border-t border-linha pt-4 text-sm text-tinta-2">
        {salario > 0 && emprestimos > 0 && (
          <Observacao
            icone={emprestimos / salario <= LIMITE_EMPRESTIMOS ? CircleCheck : TriangleAlert}
            cor={emprestimos / salario <= LIMITE_EMPRESTIMOS ? "var(--bom)" : "var(--critico)"}
          >
            Empréstimos levam <strong className="text-tinta">{formatarPercentual(emprestimos / salario)}</strong>{" "}
            do salário. O teto usual é {formatarPercentual(LIMITE_EMPRESTIMOS)}.
          </Observacao>
        )}
        <Observacao icone={Lightbulb} cor="var(--acento)">
          A maior conta é <strong className="text-tinta">{maiorConta.descricao}</strong>, com{" "}
          {formatar(maiorConta.centavos)}
          {salario > 0 && ` (${formatarPercentual(maiorConta.centavos / salario)} do salário)`}.
        </Observacao>
      </div>
    </div>
  );
}

function Observacao({
  icone: Icone,
  cor,
  children,
}: {
  icone: LucideIcon;
  cor: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex gap-2.5">
      <Icone className="mt-0.5 size-4 shrink-0" style={{ color: cor }} />
      <span>{children}</span>
    </p>
  );
}
