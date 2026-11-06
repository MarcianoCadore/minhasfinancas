import { centavos, lerJson, mes, objeto, rota } from "@/lib/servidor/api";
import { gravarRecebimentos } from "@/lib/servidor/banco";

export function PUT(request: Request) {
  return rota(async (usuario) => {
    const corpo = objeto(await lerJson(request));
    const recebimentos = {
      quintoDiaUtil: centavos(corpo.quintoDiaUtil, { zeroPermitido: true }),
      dia20: centavos(corpo.dia20, { zeroPermitido: true }),
    };
    gravarRecebimentos(usuario.id, mes(corpo.mes), recebimentos);
    return Response.json(recebimentos);
  });
}
