"use client";

import { useEffect } from "react";
import { CalendarPlus, CloudOff, CopyPlus, RotateCcw } from "lucide-react";
import { Avisos } from "@/components/Avisos";
import { Contas } from "@/components/Contas";
import { Investir } from "@/components/Investir";
import { Relatorios } from "@/components/Relatorios";
import { TelaAcesso } from "@/components/TelaAcesso";
import { estilo } from "@/components/ui";
import { VisaoGeral } from "@/components/VisaoGeral";
import { contasParaCopiar } from "@/lib/calculos";
import { carregar, copiarMes, useEstado, useMes } from "@/lib/cliente";
import { doMes, mesPorExtenso, somarMeses, type Dados } from "@/lib/financas";

export default function Financas() {
  const estado = useEstado();

  useEffect(() => {
    void carregar();
    // Ao voltar para a aba, busca de novo: o que foi alterado no celular aparece aqui.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, []);

  return (
    <>
      {estado.fase === "carregando" && <Carregando />}
      {estado.fase === "login" && <TelaAcesso />}
      {estado.fase === "erro" && <Falha mensagem={estado.mensagem} />}
      {estado.fase === "pronto" && <Painel dados={estado.dados} />}
      <Avisos />
    </>
  );
}

function Painel({ dados }: { dados: Dados }) {
  const mes = useMes();
  if (!mes) return null;
  const atual = doMes(dados, mes);
  const contasDe = (m: string) => dados.contas.filter((conta) => conta.mes === m);
  const proximo = somarMeses(mes, 1);
  const paraOProximo = contasParaCopiar(atual.contas, contasDe(proximo)).length;
  // Para um mês vazio, a origem da cópia é o último mês anterior que tem contas.
  const origem = dados.contas.map((conta) => conta.mes).filter((m) => m < mes).sort().at(-1) ?? null;

  return (
    <div className="flex flex-col gap-12">
      {atual.contas.length === 0 && (
        <MesVazio
          mes={mes}
          origem={origem}
          quantidade={origem ? contasParaCopiar(contasDe(origem), []).length : 0}
        />
      )}
      <section id="visao" className="scroll-mt-24">
        <VisaoGeral dados={atual} />
      </section>
      <section id="contas" className="scroll-mt-24">
        <Contas
          mes={mes}
          contas={atual.contas}
          copiar={paraOProximo ? { para: proximo, quantidade: paraOProximo } : null}
        />
      </section>
      <section id="relatorios" className="scroll-mt-24">
        <Relatorios dados={atual} />
      </section>
      <section id="investir" className="scroll-mt-24">
        <Investir dados={atual} />
      </section>
    </div>
  );
}

function MesVazio({ mes, origem, quantidade }: { mes: string; origem: string | null; quantidade: number }) {
  return (
    <div className="flex animate-entrar flex-col gap-4 rounded-2xl border border-dashed border-linha p-5 sm:flex-row sm:items-center">
      <CalendarPlus className="size-6 shrink-0 text-acento" />
      <div className="flex-1">
        <p className="font-semibold">Nenhuma conta em {mesPorExtenso(mes)}</p>
        <p className="text-sm text-tinta-3">
          {origem && quantidade
            ? `Copie as ${quantidade} contas que se repetem de ${mesPorExtenso(origem)} (todas a pagar) ou cadastre abaixo.`
            : "Cadastre as contas deste mês abaixo, ou use as setas no topo para ir a outro mês."}
        </p>
      </div>
      {origem && quantidade > 0 && (
        <button type="button" onClick={() => void copiarMes(origem, mes)} className={estilo.botao}>
          <CopyPlus className="size-4" />
          Copiar de {mesPorExtenso(origem)}
        </button>
      )}
    </div>
  );
}

function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-superficie lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl bg-superficie" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-superficie" />
        ))}
      </div>
    </div>
  );
}

function Falha({ mensagem }: { mensagem: string }) {
  return (
    <div className={`${estilo.cartao} mx-auto mt-10 max-w-md p-6 text-center`}>
      <CloudOff className="mx-auto size-8 text-tinta-3" />
      <p className="mt-3 font-semibold">Não foi possível carregar seus dados</p>
      <p className="mt-1 text-sm text-tinta-3">{mensagem}</p>
      <button type="button" onClick={() => void carregar()} className={`${estilo.botao} mt-5`}>
        <RotateCcw className="size-4" />
        Tentar de novo
      </button>
    </div>
  );
}
