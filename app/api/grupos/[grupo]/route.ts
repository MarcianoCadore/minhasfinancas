import type { NextRequest } from "next/server";
import { identificador, mes, rota } from "@/lib/servidor/api";
import { removerGrupo } from "@/lib/servidor/banco";

// Apaga o restante de uma série a partir de um mês: DELETE /api/grupos/<id>?desde=AAAA-MM
export function DELETE(request: NextRequest, { params }: { params: Promise<{ grupo: string }> }) {
  return rota(async (usuario) => {
    const { grupo } = await params;
    const removidas = removerGrupo(usuario.id, identificador(grupo), mes(request.nextUrl.searchParams.get("desde")));
    return Response.json({ removidas });
  });
}
