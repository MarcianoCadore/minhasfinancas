import { Wallet } from "lucide-react";
import { MenuCelular, MenuTopo, MenuUsuario, SeletorMes } from "@/components/Navegacao";
import Financas from "./financas";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[30rem]"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 0%, color-mix(in oklab, var(--acento) 20%, transparent), transparent)",
        }}
      />
      <header className="sticky top-0 z-30 border-b border-linha bg-plano/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-acento to-[color-mix(in_oklab,var(--acento),black_30%)] text-white shadow-lg shadow-acento/30">
            <Wallet className="size-5" />
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="font-semibold tracking-tight">Minhas Finanças</p>
            <p className="text-xs text-tinta-3">Salário, contas e investimentos</p>
          </div>
          <SeletorMes />
          <MenuTopo />
          <MenuUsuario />
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 sm:px-6 md:pb-16">
        <Financas />
      </main>
      <MenuCelular />
    </div>
  );
}
