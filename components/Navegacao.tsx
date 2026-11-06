"use client";

import { useEffect, useState } from "react";
import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PiggyBank,
} from "lucide-react";
import { escolherMes, sair, useEstado, useMes } from "@/lib/cliente";
import { nomeDoMes, somarMeses } from "@/lib/financas";
import { estilo } from "./ui";

// Troca o mês exibido em toda a página.
export function SeletorMes() {
  const mes = useMes();
  if (!mes) return null;
  return (
    <div className="ml-auto flex items-center gap-0.5 rounded-xl border border-linha bg-superficie/70 p-1 md:ml-6">
      <button
        type="button"
        onClick={() => escolherMes(somarMeses(mes, -1))}
        aria-label={`Ir para ${nomeDoMes(somarMeses(mes, -1))}`}
        className={estilo.botaoIcone}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-36 text-center text-sm font-medium tabular-nums">
        {nomeDoMes(mes)}
      </span>
      <button
        type="button"
        onClick={() => escolherMes(somarMeses(mes, 1))}
        aria-label={`Ir para ${nomeDoMes(somarMeses(mes, 1))}`}
        className={estilo.botaoIcone}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const SECOES = [
  { id: "visao", texto: "Visão geral", icone: LayoutDashboard },
  { id: "contas", texto: "Contas", icone: ListChecks },
  { id: "relatorios", texto: "Relatórios", icone: ChartColumn },
  { id: "investir", texto: "Investir", icone: PiggyBank },
];

// Qual seção está no meio da tela agora (null enquanto os dados não carregaram).
function useSecaoAtiva() {
  const pronto = useEstado().fase === "pronto";
  const [ativa, setAtiva] = useState(SECOES[0].id);

  useEffect(() => {
    if (!pronto) return;
    const observador = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setAtiva(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    SECOES.forEach(({ id }) => {
      const secao = document.getElementById(id);
      if (secao) observador.observe(secao);
    });
    return () => observador.disconnect();
  }, [pronto]);

  return pronto ? ativa : null;
}

export function MenuTopo() {
  const ativa = useSecaoAtiva();
  if (!ativa) return null;
  return (
    <nav aria-label="Seções" className="ml-auto hidden items-center gap-1 md:flex">
      {SECOES.map(({ id, texto }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={ativa === id ? "location" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            ativa === id ? "bg-tinta/5 font-medium text-tinta" : "text-tinta-3 hover:text-tinta"
          }`}
        >
          {texto}
        </a>
      ))}
    </nav>
  );
}

// Quem está logado neste aparelho, e o botão de sair.
export function MenuUsuario() {
  const estado = useEstado();
  if (estado.fase !== "pronto") return null;
  const { usuario } = estado.dados;
  return (
    <div className="flex items-center gap-2 md:ml-2 md:border-l md:border-linha md:pl-3">
      <span className="hidden items-center gap-2 text-sm text-tinta-2 lg:flex">
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-full bg-acento/15 text-xs font-semibold text-acento uppercase"
        >
          {usuario[0]}
        </span>
        {usuario}
      </span>
      <button
        type="button"
        onClick={() => void sair()}
        aria-label={`Sair (${usuario})`}
        title={`Sair (${usuario})`}
        className={estilo.botaoIcone}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

// Fica fora do <header>: o desfoque do cabeçalho prenderia o "fixed" dentro dele.
export function MenuCelular() {
  const ativa = useSecaoAtiva();
  if (!ativa) return null;
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-linha bg-superficie/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {SECOES.map(({ id, texto, icone: Icone }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={ativa === id ? "location" : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${
            ativa === id ? "font-medium text-acento" : "text-tinta-3"
          }`}
        >
          <Icone className="size-5" />
          {texto}
        </a>
      ))}
    </nav>
  );
}
