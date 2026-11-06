import {
  booleano,
  centavos,
  descricao,
  lerJson,
  objeto,
  rota,
  tipo,
} from "@/lib/servidor/api";
import { atualizarConta, removerConta, type CamposConta } from "@/lib/servidor/banco";

type Contexto = { params: Promise<{ id: string }> };

const naoEncontrada = () => Response.json({ erro: "Conta não encontrada." }, { status: 404 });

export function PATCH(request: Request, { params }: Contexto) {
  return rota(async (usuario) => {
    const { id } = await params;
    const corpo = objeto(await lerJson(request));
    const campos: CamposConta = {};
    if ("descricao" in corpo) campos.descricao = descricao(corpo.descricao);
    if ("tipo" in corpo) campos.tipo = tipo(corpo.tipo);
    if ("centavos" in corpo) campos.centavos = centavos(corpo.centavos);
    if ("paga" in corpo) campos.paga = booleano(corpo.paga);
    const conta = atualizarConta(usuario.id, id, campos);
    return conta ? Response.json(conta) : naoEncontrada();
  });
}

export function DELETE(_request: Request, { params }: Contexto) {
  return rota(async (usuario) => {
    const { id } = await params;
    return removerConta(usuario.id, id) ? new Response(null, { status: 204 }) : naoEncontrada();
  });
}
