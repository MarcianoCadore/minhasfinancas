import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { apagarSessao, criarSessao, usuarioDaSessao } from "./banco";

const COOKIE = "mf_sessao";
const DURACAO_S = 60 * 60 * 24 * 180; // cada aparelho entra uma vez a cada 6 meses

// Formato guardado no banco: scrypt:<sal hex>:<hash hex>. A senha em si nunca é gravada.
export function gerarHash(senha: string) {
  const sal = randomBytes(16);
  return `scrypt:${sal.toString("hex")}:${scryptSync(senha, sal, 32).toString("hex")}`;
}

export function senhaConfere(senha: string, guardado: string) {
  const [, sal, hash] = guardado.split(":");
  const esperado = Buffer.from(hash, "hex");
  return timingSafeEqual(esperado, scryptSync(senha, Buffer.from(sal, "hex"), esperado.length));
}

export async function iniciarSessao(usuarioId: number) {
  // O nginx informa se o navegador usou https; só nesse caso o cookie pode ser "secure".
  const https = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, criarSessao(usuarioId, DURACAO_S), {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: DURACAO_S,
  });
}

export async function encerrarSessao() {
  const armazenamento = await cookies();
  const token = armazenamento.get(COOKIE)?.value;
  if (token) apagarSessao(token);
  armazenamento.delete(COOKIE);
}

export async function usuarioAtual() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? usuarioDaSessao(token) : null;
}
