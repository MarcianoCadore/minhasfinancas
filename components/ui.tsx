"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { formatar } from "@/lib/financas";

export const estilo = {
  cartao: "rounded-2xl border border-linha bg-superficie",
  campo:
    "h-10 w-full rounded-lg border border-linha bg-plano px-3 text-tinta outline-none transition placeholder:text-tinta-3 focus:border-acento focus:ring-2 focus:ring-acento/25 disabled:opacity-50",
  botao:
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-tinta px-4 font-medium text-superficie transition hover:opacity-85 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  botaoSecundario:
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-linha px-3 text-sm font-medium text-tinta-2 transition hover:bg-tinta/5 hover:text-tinta",
  botaoIcone:
    "grid size-8 shrink-0 place-items-center rounded-lg text-tinta-3 transition hover:bg-tinta/5 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/40",
};

// Conta de animação: o número desliza até o novo valor em vez de saltar.
export function useNumeroAnimado(alvo: number, duracao = 600) {
  const [valor, setValor] = useState(alvo);
  const atual = useRef(alvo);
  useEffect(() => {
    const de = atual.current;
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = reduzido ? 1 : Math.min(1, (agora - inicio) / duracao);
      atual.current = Math.round(de + (alvo - de) * (1 - (1 - t) ** 3));
      setValor(atual.current);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);
  return valor;
}

export function Dinheiro({ centavos, className }: { centavos: number; className?: string }) {
  return <span className={className}>{formatar(useNumeroAnimado(centavos))}</span>;
}

export function TituloSecao({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-acento/15 text-acento">
          <Icone className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          {descricao && <p className="text-sm text-tinta-3">{descricao}</p>}
        </div>
      </div>
      {acao}
    </div>
  );
}

export function Alternador<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: readonly { valor: T; texto: ReactNode }[];
  valor: T;
  aoMudar: (valor: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className="inline-flex shrink-0 rounded-lg border border-linha bg-plano p-0.5"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          role="radio"
          aria-checked={opcao.valor === valor}
          onClick={() => aoMudar(opcao.valor)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition ${
            opcao.valor === valor
              ? "bg-superficie font-medium text-tinta shadow-sm"
              : "text-tinta-3 hover:text-tinta"
          }`}
        >
          {opcao.texto}
        </button>
      ))}
    </div>
  );
}

// Campo de valor com "R$" fixo à esquerda.
export function CampoDinheiro(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-tinta-3">
        R$
      </span>
      <input inputMode="decimal" {...props} className={`${estilo.campo} pl-9 tabular-nums`} />
    </div>
  );
}

// Dica flutuante que acompanha o ponteiro (ou o elemento em foco, no teclado).
type Dica = { x: number; y: number; conteudo: ReactNode } | null;

export function useDica() {
  const [dica, setDica] = useState<Dica>(null);
  return {
    dica,
    mostrar(evento: React.PointerEvent | React.FocusEvent, conteudo: ReactNode) {
      if ("clientX" in evento) {
        setDica({ x: evento.clientX, y: evento.clientY, conteudo });
      } else {
        const caixa = evento.currentTarget.getBoundingClientRect();
        setDica({ x: caixa.left + caixa.width / 2, y: caixa.top, conteudo });
      }
    },
    esconder: () => setDica(null),
  };
}

export function DicaFlutuante({ dica }: { dica: Dica }) {
  if (!dica) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-linha bg-superficie px-3 py-2 text-sm shadow-xl shadow-black/10"
      style={{ left: dica.x, top: dica.y }}
    >
      {dica.conteudo}
    </div>
  );
}

// Conteúdo das dicas: o valor em destaque e, abaixo, a série que ele representa.
export function DicaValor({
  titulo,
  cor,
  valor,
  detalhe,
}: {
  titulo: string;
  cor: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-base font-semibold tabular-nums">{valor}</span>
      <span className="flex items-center gap-1.5 text-tinta-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: cor }} />
        {titulo}
      </span>
      {detalhe && <span className="text-xs text-tinta-3">{detalhe}</span>}
    </div>
  );
}

// Largura real do elemento, para desenhar gráficos SVG no tamanho certo.
export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}
