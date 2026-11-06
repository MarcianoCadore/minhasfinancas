import { lerJson, nomeDeUsuario, objeto, rotaAberta, senha } from "@/lib/servidor/api";
import { criarUsuario } from "@/lib/servidor/banco";
import { gerarHash, iniciarSessao } from "@/lib/servidor/sessao";

// Cadastro: cria o usuário e já deixa logado.
export function POST(request: Request) {
  return rotaAberta(async () => {
    const corpo = objeto(await lerJson(request));
    const usuario = nomeDeUsuario(corpo.usuario);
    const id = criarUsuario(usuario, gerarHash(senha(corpo.senha)));
    if (id === null) {
      return Response.json({ erro: "Esse usuário já existe. Escolha outro." }, { status: 409 });
    }
    await iniciarSessao(id);
    return new Response(null, { status: 201 });
  });
}
