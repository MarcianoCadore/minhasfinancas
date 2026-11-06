import {
  CircleCheck,
  CircleHelp,
  CreditCard,
  House,
  Landmark,
  OctagonAlert,
  Receipt,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Categoria, Saude } from "@/lib/calculos";

export const COR: Record<Categoria, string> = {
  "Cartão de crédito": "var(--cat-1)",
  Boleto: "var(--cat-2)",
  Empréstimo: "var(--cat-3)",
  "Contas da casa": "var(--cat-4)",
  "Sem tipo": "var(--tinta-3)",
};

const ICONE: Record<Categoria, LucideIcon> = {
  "Cartão de crédito": CreditCard,
  Boleto: Receipt,
  Empréstimo: Landmark,
  "Contas da casa": House,
  "Sem tipo": CircleHelp,
};

export function MarcaCategoria({ categoria, className = "size-2.5" }: { categoria: Categoria; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ background: COR[categoria] }}
    />
  );
}

export function IconeCategoria({ categoria, pequeno = false }: { categoria: Categoria; pequeno?: boolean }) {
  const Icone = ICONE[categoria];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl ${pequeno ? "size-8" : "size-10"}`}
      style={{
        background: `color-mix(in oklab, ${COR[categoria]} 16%, transparent)`,
        color: COR[categoria],
      }}
    >
      <Icone className={pequeno ? "size-4" : "size-5"} />
    </span>
  );
}

// Situação sempre com ícone e texto, nunca só pela cor.
const SAUDE: Record<Saude, { texto: string; icone: LucideIcon; cor: string }> = {
  saudavel: { texto: "Saudável", icone: CircleCheck, cor: "var(--bom)" },
  atencao: { texto: "Atenção", icone: TriangleAlert, cor: "var(--atencao)" },
  critico: { texto: "Crítico", icone: OctagonAlert, cor: "var(--critico)" },
};

export function SeloSaude({ saude }: { saude: Saude }) {
  const { texto, icone: Icone, cor } = SAUDE[saude];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-tinta"
      style={{ background: `color-mix(in oklab, ${cor} 16%, transparent)` }}
    >
      <Icone className="size-3.5" style={{ color: cor }} />
      {texto}
    </span>
  );
}
