import { rota } from "@/lib/servidor/api";
import { lerDados } from "@/lib/servidor/banco";

export function GET() {
  return rota((usuario) => Response.json(lerDados(usuario)));
}
