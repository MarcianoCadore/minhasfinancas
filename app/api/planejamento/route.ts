import { centavos, ErroValidacao, lerJson, objeto, rota } from "@/lib/servidor/api";
import { gravarPlanejamento } from "@/lib/servidor/banco";

export function PUT(request: Request) {
  return rota(async (usuario) => {
    const corpo = objeto(await lerJson(request));
    const rendimentoAnual = corpo.rendimentoAnual;
    if (typeof rendimentoAnual !== "number" || rendimentoAnual < 0 || rendimentoAnual > 50) {
      throw new ErroValidacao("Rendimento inválido.");
    }
    const planejamento = {
      diaADia: corpo.diaADia === null ? null : centavos(corpo.diaADia, { zeroPermitido: true }),
      rendimentoAnual,
    };
    gravarPlanejamento(usuario.id, planejamento);
    return Response.json(planejamento);
  });
}
