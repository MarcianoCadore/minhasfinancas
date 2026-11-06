"use client";

import { CircleCheck, OctagonAlert, Undo2, X } from "lucide-react";
import { fecharAviso, useAvisos } from "@/lib/cliente";

export function Avisos() {
  const avisos = useAvisos();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className="pointer-events-auto flex w-full max-w-lg animate-entrar flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-tinta px-4 py-3 text-sm text-superficie shadow-2xl shadow-black/30"
        >
          {aviso.erro ? (
            <OctagonAlert className="size-4 shrink-0 text-critico" />
          ) : (
            <CircleCheck className="size-4 shrink-0 opacity-70" />
          )}
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          {aviso.acoes?.map((acao) => (
            <button
              key={acao.texto}
              type="button"
              onClick={() => {
                acao.executar();
                fecharAviso(aviso.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-superficie/15"
            >
              {acao.texto === "Desfazer" && <Undo2 className="size-4" />}
              {acao.texto}
            </button>
          ))}
          <button
            type="button"
            onClick={() => fecharAviso(aviso.id)}
            aria-label="Fechar aviso"
            className="rounded-md p-1 opacity-60 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
