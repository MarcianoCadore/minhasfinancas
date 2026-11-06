import { contas, lerJson, rota } from "@/lib/servidor/api";
import { inserirContas } from "@/lib/servidor/banco";

// Recebe uma lista: uma conta só, ou a série inteira de parcelas.
// Os ids vêm do navegador: a tela mostra na hora e o "desfazer" recria as mesmas.
export function POST(request: Request) {
  return rota(async (usuario) => {
    const novas = contas(await lerJson(request));
    if (!inserirContas(usuario.id, novas)) {
      return Response.json({ erro: "Essa conta já existe." }, { status: 409 });
    }
    return Response.json(novas, { status: 201 });
  });
}
