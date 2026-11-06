"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { salvarRecebimentos } from "@/lib/cliente";
import {
  porCategoria,
  salarioDe,
  saudeDoComprometimento,
  somar,
  sugerirInvestimento,
} from "@/lib/calculos";
import {
  formatar,
  formatarPercentual,
  paraCampo,
  paraCentavos,
  nomeDoMes,
  type DadosDoMes,
  type Recebimentos,
} from "@/lib/financas";
import { COR, SeloSaude } from "./categorias";
import { CampoDinheiro, DicaFlutuante, DicaValor, Dinheiro, estilo, useDica } from "./ui";

export function VisaoGeral({ dados }: { dados: DadosDoMes }) {
  const { recebimentos } = dados;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Destaque dados={dados} />
        <CartaoRecebimentos
          // Recria o formulário quando o valor salvo muda (inclusive vindo de outro aparelho).
          key={`${dados.mes}-${recebimentos.quintoDiaUtil}-${recebimentos.dia20}`}
          mes={dados.mes}
          recebimentos={recebimentos}
        />
      </div>
      <Indicadores dados={dados} />
    </div>
  );
}

function Destaque({ dados }: { dados: DadosDoMes }) {
  const salario = salarioDe(dados);
  const total = somar(dados.contas);
  const sobra = salario - total;
  const fatias = porCategoria(dados.contas);
  const escala = Math.max(salario, total) || 1;
  const { dica, mostrar, esconder } = useDica();

  return (
    <div className={`${estilo.cartao} relative overflow-hidden p-5 sm:p-6 lg:col-span-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-tinta-3">
          <CalendarDays className="size-4" />
          {nomeDoMes(dados.mes)}
        </p>
        {salario > 0 && <SeloSaude saude={saudeDoComprometimento(total / salario)} />}
      </div>

      <p className="mt-5 text-sm font-medium text-tinta-2">Sobra do mês</p>
      <Dinheiro centavos={sobra} className="block text-5xl font-semibold tracking-tight sm:text-6xl" />
      <p className="mt-2 text-sm text-tinta-2">
        {salario > 0 ? (
          <>
            <strong className="font-medium text-tinta">{formatarPercentual(total / salario)}</strong> do
            salário de {formatar(salario)} vai para as contas
            {sobra < 0 && <> — elas passam do salário em {formatar(-sobra)}</>}.
          </>
        ) : (
          <>Informe seus recebimentos ao lado para calcular a sobra.</>
        )}
      </p>

      {(salario > 0 || total > 0) && (
        <>
          <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-tinta-3 uppercase">
            Para onde vai o salário
          </p>
          <div className="relative">
            <div className="flex h-5 gap-[2px]">
              {fatias.map((fatia) => {
                const conteudo = (
                  <DicaValor
                    titulo={fatia.categoria}
                    cor={COR[fatia.categoria]}
                    valor={formatar(fatia.centavos)}
                    detalhe={`${fatia.quantidade} ${fatia.quantidade === 1 ? "conta" : "contas"}${
                      salario ? ` · ${formatarPercentual(fatia.centavos / salario)} do salário` : ""
                    }`}
                  />
                );
                return (
                  <div
                    key={fatia.categoria}
                    tabIndex={0}
                    aria-label={`${fatia.categoria}: ${formatar(fatia.centavos)}`}
                    onPointerMove={(e) => mostrar(e, conteudo)}
                    onPointerLeave={esconder}
                    onFocus={(e) => mostrar(e, conteudo)}
                    onBlur={esconder}
                    className="h-full min-w-[3px] outline-none transition-[flex-grow,filter] duration-500 last:rounded-r-[4px] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-superficie"
                    style={{ flexGrow: fatia.centavos, flexBasis: 0, background: COR[fatia.categoria] }}
                  />
                );
              })}
              {sobra > 0 && (
                <div
                  className="h-full rounded-r-[4px] bg-trilho transition-[flex-grow] duration-500"
                  style={{ flexGrow: sobra, flexBasis: 0 }}
                />
              )}
            </div>
            {sobra < 0 && (
              // Onde o salário acaba, quando as contas passam dele.
              <span
                aria-hidden
                className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-tinta"
                style={{ left: `${(salario / escala) * 100}%` }}
              />
            )}
          </div>

          <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {fatias.map((fatia) => (
              <li key={fatia.categoria} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: COR[fatia.categoria] }} />
                <span className="flex-1 truncate text-tinta-2">{fatia.categoria}</span>
                <span className="font-medium tabular-nums">{formatar(fatia.centavos)}</span>
                {salario > 0 && (
                  <span className="w-12 text-right text-tinta-3 tabular-nums">
                    {formatarPercentual(fatia.centavos / salario)}
                  </span>
                )}
              </li>
            ))}
            {sobra > 0 && (
              <li className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[3px] bg-trilho ring-1 ring-linha" />
                <span className="flex-1 text-tinta-2">Sobra</span>
                <span className="font-medium tabular-nums">{formatar(sobra)}</span>
                <span className="w-12 text-right text-tinta-3 tabular-nums">
                  {formatarPercentual(sobra / salario)}
                </span>
              </li>
            )}
          </ul>
        </>
      )}
      <DicaFlutuante dica={dica} />
    </div>
  );
}

function CartaoRecebimentos({ mes, recebimentos }: { mes: string; recebimentos: Recebimentos }) {
  const [quinto, setQuinto] = useState(() => paraCampo(recebimentos.quintoDiaUtil));
  const [dia20, setDia20] = useState(() => paraCampo(recebimentos.dia20));
  const [erro, setErro] = useState("");

  // Campo vazio conta como zero: nem todo mês tem os dois recebimentos.
  const lerCampo = (texto: string) => (texto.trim() ? paraCentavos(texto) : 0);
  const novoQuinto = lerCampo(quinto);
  const novoDia20 = lerCampo(dia20);
  const alterado =
    novoQuinto !== recebimentos.quintoDiaUtil || novoDia20 !== recebimentos.dia20;

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (novoQuinto === null || novoDia20 === null) {
      setErro("Valor inválido. Exemplo: 5.000,00");
      return;
    }
    setErro("");
    void salvarRecebimentos(mes, { quintoDiaUtil: novoQuinto, dia20: novoDia20 });
  }

  return (
    <form onSubmit={salvar} className={`${estilo.cartao} flex flex-col p-5 sm:p-6`}>
      <p className="flex items-center gap-2 font-semibold">
        <Banknote className="size-5 text-acento" />
        Recebimentos
      </p>
      <p className="mt-1 text-sm text-tinta-3">O salário é a soma das duas datas.</p>

      <div className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-tinta-2">5º dia útil</span>
          <CampoDinheiro placeholder="0,00" value={quinto} onChange={(e) => setQuinto(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-tinta-2">Dia 20 do mês</span>
          <CampoDinheiro placeholder="0,00" value={dia20} onChange={(e) => setDia20(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-linha pt-4">
        <span className="text-sm text-tinta-3">Salário</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatar((novoQuinto ?? 0) + (novoDia20 ?? 0))}
        </span>
      </div>
      {erro && <p className="mt-2 text-sm text-critico">{erro}</p>}
      <button type="submit" disabled={!alterado} className={`${estilo.botao} mt-4 w-full`}>
        {alterado ? "Salvar recebimentos" : "Recebimentos salvos"}
      </button>
    </form>
  );
}

function Indicadores({ dados }: { dados: DadosDoMes }) {
  const { contas, recebimentos } = dados;
  const salario = salarioDe(dados);
  const pagas = contas.filter((conta) => conta.paga);
  const aPagar = somar(contas) - somar(pagas);
  const { sugestao } = sugerirInvestimento(dados);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Indicador icone={Wallet} rotulo="Salário" centavos={salario}>
        {formatar(recebimentos.quintoDiaUtil)} + {formatar(recebimentos.dia20)}
      </Indicador>
      <Indicador icone={CircleDollarSign} rotulo="Contas do mês" centavos={somar(contas)}>
        {contas.length} {contas.length === 1 ? "conta cadastrada" : "contas cadastradas"}
      </Indicador>
      <Indicador icone={ListChecks} rotulo="Falta pagar" centavos={aPagar}>
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-trilho">
            <span
              className="block h-full rounded-full bg-bom transition-[width] duration-500"
              style={{ width: `${contas.length ? (pagas.length / contas.length) * 100 : 0}%` }}
            />
          </span>
          <span className="shrink-0">
            {pagas.length} de {contas.length} pagas
          </span>
        </span>
      </Indicador>
      <Indicador icone={PiggyBank} rotulo="Para investir" centavos={sugestao} sufixo="/mês">
        <a href="#investir" className="inline-flex items-center gap-1 text-acento hover:underline">
          {salario ? `${formatarPercentual(sugestao / salario)} do salário` : "Ver plano"}
          <ArrowRight className="size-3.5" />
        </a>
      </Indicador>
    </div>
  );
}

function Indicador({
  icone: Icone,
  rotulo,
  centavos,
  sufixo,
  children,
}: {
  icone: LucideIcon;
  rotulo: string;
  centavos: number;
  sufixo?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${estilo.cartao} flex flex-col p-4 sm:p-5`}>
      <p className="flex items-center gap-2 text-sm text-tinta-3">
        <Icone className="size-4" />
        {rotulo}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <Dinheiro centavos={centavos} className="text-xl font-semibold tracking-tight sm:text-2xl" />
        {sufixo && <span className="text-sm text-tinta-3">{sufixo}</span>}
      </p>
      <div className="mt-auto pt-2 text-xs text-tinta-2 sm:text-sm">{children}</div>
    </div>
  );
}

