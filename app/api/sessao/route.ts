import { lerJson, objeto, rotaAberta } from "@/lib/servidor/api";
import { buscarUsuario, existeUsuario } from "@/lib/servidor/banco";
import { encerrarSessao, gerarHash, iniciarSessao, senhaConfere } from "@/lib/servidor/sessao";

// A tela de cadastro avisa quando ainda não existe nenhuma conta.
export function GET() {
  return rotaAberta(() => Response.json({ primeiroCadastro: !existeUsuario() }));
}

export function POST(request: Request) {
  return rotaAberta(async () => {
    const corpo = objeto(await lerJson(request));
    const usuario = typeof corpo.usuario === "string" ? corpo.usuario.trim().toLowerCase() : "";
    const senha = typeof corpo.senha === "string" ? corpo.senha : "";
    const encontrado = buscarUsuario(usuario);
    // Mesmo custo quando o usuário não existe: o tempo de resposta não revela quem está cadastrado.
    if (!encontrado) gerarHash(senha);
    if (!encontrado || !senhaConfere(senha, encontrado.senha_hash)) {
      await new Promise((espera) => setTimeout(espera, 1000)); // freia tentativas em série
      return Response.json({ erro: "Usuário ou senha incorretos." }, { status: 401 });
    }
    await iniciarSessao(encontrado.id);
    return new Response(null, { status: 204 });
  });
}

export function DELETE() {
  return rotaAberta(async () => {
    await encerrarSessao();
    return new Response(null, { status: 204 });
  });
}
