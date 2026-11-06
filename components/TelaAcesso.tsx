"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Info, LockKeyhole, OctagonAlert, UserPlus } from "lucide-react";
import { cadastrar, entrar } from "@/lib/cliente";
import { estilo } from "./ui";

type Modo = "entrar" | "cadastrar";

export function TelaAcesso() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [primeiroCadastro, setPrimeiroCadastro] = useState(false);

  useEffect(() => {
    fetch("/api/sessao", { cache: "no-store" })
      .then((resposta) => resposta.json())
      .then((resposta: { primeiroCadastro: boolean }) => setPrimeiroCadastro(resposta.primeiroCadastro))
      .catch(() => {});
  }, []);

  const cadastro = modo === "cadastrar";

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro("");
    setSenha("");
    setConfirmacao("");
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (cadastro && senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    setEnviando(true);
    setErro("");
    const nome = usuario.trim().toLowerCase();
    const falha = cadastro ? await cadastrar(nome, senha) : await entrar(nome, senha);
    if (falha) {
      setErro(falha);
      setEnviando(false);
    }
  }

  const campoSenha = (
    valor: string,
    aoMudar: (valor: string) => void,
    rotulo: string,
    autoComplete: string,
  ) => (
    <label className="mt-4 block">
      <span className="text-sm text-tinta-2">{rotulo}</span>
      <div className="relative mt-1.5">
        <input
          type={verSenha ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={cadastro ? 6 : undefined}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className={`${estilo.campo} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVerSenha((atual) => !atual)}
          aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
          className={`${estilo.botaoIcone} absolute top-1 right-1`}
        >
          {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );

  return (
    <div className="mx-auto mt-6 w-full max-w-sm animate-entrar sm:mt-16">
      <form onSubmit={enviar} className={`${estilo.cartao} p-6 shadow-xl shadow-black/5 sm:p-8`}>
        <span className="grid size-12 place-items-center rounded-2xl bg-acento/15 text-acento">
          {cadastro ? <UserPlus className="size-6" /> : <LockKeyhole className="size-6" />}
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {cadastro ? "Criar sua conta" : "Entrar"}
        </h1>
        <p className="mt-1 text-sm text-tinta-3">
          {cadastro
            ? "Escolha um usuário e uma senha. Suas contas ficam separadas das de outras pessoas."
            : "Use seu usuário e senha. Cada aparelho entra uma vez e fica conectado."}
        </p>

        <label className="mt-6 block">
          <span className="text-sm text-tinta-2">Usuário</span>
          <input
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={`${estilo.campo} mt-1.5`}
          />
          {cadastro && (
            <span className="mt-1 block text-xs text-tinta-3">
              Letras sem acento, números, ponto ou hífen. Ex.: stefani
            </span>
          )}
        </label>
        {campoSenha(senha, setSenha, "Senha", cadastro ? "new-password" : "current-password")}
        {cadastro && campoSenha(confirmacao, setConfirmacao, "Repita a senha", "new-password")}

        {cadastro && primeiroCadastro && (
          <p className="mt-4 flex gap-2 rounded-lg bg-acento/10 p-3 text-xs text-tinta-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-acento" />
            Esta é a primeira conta do app: as contas já cadastradas antes do login ficarão nela.
          </p>
        )}

        {erro && (
          <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-critico">
            <OctagonAlert className="size-4 shrink-0" />
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando} className={`${estilo.botao} mt-6 w-full`}>
          {enviando ? "Aguarde…" : cadastro ? "Criar conta e entrar" : "Entrar"}
        </button>

        {cadastro ? (
          <p className="mt-4 text-center text-sm text-tinta-3">
            Já tem conta?{" "}
            <button
              type="button"
              onClick={() => trocarModo("entrar")}
              className="font-medium text-acento hover:underline"
            >
              Entrar
            </button>
          </p>
        ) : (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-tinta-3">
              <span className="h-px flex-1 bg-linha" />
              ainda não tem conta?
              <span className="h-px flex-1 bg-linha" />
            </div>
            <button
              type="button"
              onClick={() => trocarModo("cadastrar")}
              className={`${estilo.botaoSecundario} h-10 w-full`}
            >
              <UserPlus className="size-4" />
              Cadastre-se
            </button>
          </>
        )}
      </form>
    </div>
  );
}
