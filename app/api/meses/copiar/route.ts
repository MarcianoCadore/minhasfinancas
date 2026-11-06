import { ErroValidacao, lerJson, mes, objeto, rota } from "@/lib/servidor/api";
import { copiarMes } from "@/lib/servidor/banco";

// Leva para o mês "para" as contas que se repetem do mês "de" (a pagar) e os recebimentos.
export function POST(request: Request) {
  return rota(async (usuario) => {
    const corpo = objeto(await lerJson(request));
    const de = mes(corpo.de);
    const para = mes(corpo.para);
    if (de === para) throw new ErroValidacao("Escolha meses diferentes.");
    const copiado = copiarMes(usuario.id, de, para);
    if (!copiado.contas && !copiado.recebimentos) {
      return Response.json({ erro: "Não há nada novo para copiar." }, { status: 409 });
    }
    return Response.json(copiado);
  });
}
