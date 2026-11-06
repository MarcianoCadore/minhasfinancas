"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowDownUp, Check, CopyPlus, ListChecks, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  adicionarContas,
  atualizarConta,
  avisar,
  copiarMes,
  escolherMes,
  removerConta,
} from "@/lib/cliente";
import { categoriaDe, porCategoria, somar, type Categoria } from "@/lib/calculos";
import {
  formatar,
  mesCurto,
  mesPorExtenso,
  novoId,
  paraCampo,
  paraCentavos,
  somarMeses,
  TIPOS_CONTA,
  type Conta,
  type TipoConta,
} from "@/lib/financas";
import { IconeCategoria, MarcaCategoria } from "./categorias";
import { Alternador, CampoDinheiro, estilo, TituloSecao } from "./ui";

type Situacao = "todas" | "apagar" | "pagas";
type Ordem = "cadastro" | "maior" | "menor" | "nome";

const ORDENS: Record<Ordem, { texto: string; comparar: (a: Conta, b: Conta) => number }> = {
  cadastro: { texto: "Ordem de cadastro", comparar: () => 0 },
  maior: { texto: "Maior valor", comparar: (a, b) => b.centavos - a.centavos },
  menor: { texto: "Menor valor", comparar: (a, b) => a.centavos - b.centavos },
  nome: { texto: "Nome (A–Z)", comparar: (a, b) => a.descricao.localeCompare(b.descricao, "pt-BR") },
};

// Busca sem acento e sem diferenciar maiúsculas: "agua" encontra "Água".
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();

export function Contas({
  mes,
  contas,
  copiar,
}: {
  mes: string;
  contas: Conta[];
  copiar: { para: string; quantidade: number } | null; // o que dá para levar ao mês seguinte
}) {
  const [busca, setBusca] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]); // vazio = todas
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [ordem, setOrdem] = useState<Ordem>("cadastro");
  const [editando, setEditando] = useState<string | null>(null);

  const termo = normalizar(busca);
  const visiveis = contas
    .filter(
      (conta) =>
        (!termo || normalizar(conta.descricao).includes(termo)) &&
        (categorias.length === 0 || categorias.includes(categoriaDe(conta))) &&
        (situacao === "todas" || (situacao === "pagas") === conta.paga),
    )
    .sort(ORDENS[ordem].comparar);
  const filtrando = Boolean(termo) || categorias.length > 0 || situacao !== "todas";
  const pagas = contas.filter((conta) => conta.paga);

  function alternarCategoria(categoria: Categoria) {
    setCategorias((atuais) =>
      atuais.includes(categoria) ? atuais.filter((c) => c !== categoria) : [...atuais, categoria],
    );
  }

  function limparFiltros() {
    setBusca("");
    setCategorias([]);
    setSituacao("todas");
  }

  return (
    <>
      <TituloSecao
        icone={ListChecks}
        titulo={`Contas de ${mesPorExtenso(mes)}`}
        descricao={
          contas.length
            ? `${pagas.length} de ${contas.length} pagas · faltam ${formatar(somar(contas) - somar(pagas))}`
            : "Cadastre as contas que saem do salário deste mês"
        }
        acao={
          copiar && (
            <button
              type="button"
              className={estilo.botaoSecundario}
              onClick={() => {
                const pergunta =
                  `Copiar ${copiar.quantidade} ${copiar.quantidade === 1 ? "conta" : "contas"} para ${mesPorExtenso(copiar.para)}, todas a pagar?\n\n` +
                  "Parcelas não entram (cada uma já está no seu mês) e o que o mês seguinte já tiver não é duplicado.";
                if (confirm(pergunta)) void copiarMes(mes, copiar.para);
              }}
            >
              <CopyPlus className="size-4" />
              Copiar para {mesPorExtenso(copiar.para)} ({copiar.quantidade})
            </button>
          )
        }
      />

      <div className={`${estilo.cartao} overflow-hidden`}>
        {/* key: ao trocar de mês, o formulário volta a sugerir o mês da tela */}
        <NovaConta key={mes} mes={mes} />

        {contas.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-linha bg-plano/50 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-3" />
                <input
                  type="search"
                  aria-label="Buscar conta"
                  placeholder="Buscar conta"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={`${estilo.campo} h-9 bg-superficie pl-9 text-sm`}
                />
              </label>
              <Alternador
                rotulo="Situação"
                valor={situacao}
                aoMudar={setSituacao}
                opcoes={[
                  { valor: "todas", texto: "Todas" },
                  { valor: "apagar", texto: "A pagar" },
                  { valor: "pagas", texto: "Pagas" },
                ]}
              />
              <label className="relative">
                <ArrowDownUp className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-3" />
                <select
                  aria-label="Ordenar contas"
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value as Ordem)}
                  className={`${estilo.campo} h-9 w-auto bg-superficie pl-9 text-sm`}
                >
                  {Object.entries(ORDENS).map(([valor, { texto }]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
              <Chip ativo={categorias.length === 0} aoClicar={() => setCategorias([])}>
                Todas
                <span className="text-tinta-3 tabular-nums">{contas.length}</span>
              </Chip>
              {porCategoria(contas).map(({ categoria, quantidade }) => (
                <Chip
                  key={categoria}
                  ativo={categorias.includes(categoria)}
                  aoClicar={() => alternarCategoria(categoria)}
                >
                  <MarcaCategoria categoria={categoria} />
                  {categoria}
                  <span className="text-tinta-3 tabular-nums">{quantidade}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}

        {contas.length === 0 ? (
          <p className="border-t border-linha px-5 py-10 text-center text-sm text-tinta-3">
            Nenhuma conta ainda. Cadastre a primeira acima.
          </p>
        ) : visiveis.length === 0 ? (
          <div className="border-t border-linha px-5 py-10 text-center text-sm text-tinta-3">
            Nenhuma conta com esses filtros.{" "}
            <button type="button" onClick={limparFiltros} className="font-medium text-acento hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-linha border-t border-linha">
            {visiveis.map((conta) =>
              editando === conta.id ? (
                <EdicaoConta key={conta.id} conta={conta} aoFechar={() => setEditando(null)} />
              ) : (
                <LinhaConta key={conta.id} conta={conta} aoEditar={() => setEditando(conta.id)} />
              ),
            )}
          </ul>
        )}

        {contas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linha bg-plano/50 px-4 py-3 text-sm text-tinta-2 sm:px-5">
            <span>
              {filtrando
                ? `Mostrando ${visiveis.length} de ${contas.length} contas`
                : `${contas.length} ${contas.length === 1 ? "conta" : "contas"}`}
            </span>
            <span className="tabular-nums">
              {filtrando ? "Total filtrado" : "Total"}:{" "}
              <strong className="font-semibold text-tinta">{formatar(somar(visiveis))}</strong>
            </span>
          </div>
        )}
      </div>
    </>
  );
}

function Chip({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition ${
        ativo
          ? "border-tinta/60 bg-superficie font-medium text-tinta shadow-sm"
          : "border-linha text-tinta-2 hover:border-tinta-3 hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

// Campos compartilhados entre o cadastro e a edição.
function useCamposConta(inicial?: Conta) {
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [tipo, setTipo] = useState<TipoConta | "">(inicial?.tipo ?? "");
  const [valor, setValor] = useState(inicial ? paraCampo(inicial.centavos) : "");
  const [erro, setErro] = useState("");

  function validar() {
    const nome = descricao.trim();
    const centavos = paraCentavos(valor);
    if (!nome) return void setErro("Informe a descrição (ex.: Nubank, Água, Aluguel).");
    if (!tipo) return void setErro("Escolha o tipo de conta.");
    if (!centavos) return void setErro("Valor inválido. Exemplo: 350,90");
    setErro("");
    return { descricao: nome, tipo, centavos };
  }

  const campos = (
    <>
      <input
        aria-label="Descrição"
        placeholder="Descrição (ex.: Nubank, Água)"
        value={descricao}
        maxLength={80}
        onChange={(e) => setDescricao(e.target.value)}
        className={estilo.campo}
      />
      <select
        aria-label="Tipo de conta"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoConta | "")}
        className={estilo.campo}
      >
        <option value="" disabled>
          Tipo de conta
        </option>
        {TIPOS_CONTA.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
      <CampoDinheiro aria-label="Valor" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
    </>
  );

  function limpar() {
    setDescricao("");
    setTipo("");
    setValor("");
  }

  return { campos, tipo, valor, erro, setErro, validar, limpar };
}

const grade = "grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_9rem_auto]";

type Base = { descricao: string; tipo: TipoConta; centavos: number };

// Vários lançamentos a partir de um formulário: cada um no seu mês, ligados pelo grupo.
function lancamentos(base: Base, itens: { mes: string; centavos?: number; parcela?: Conta["parcela"] }[]) {
  const grupo = itens.length > 1 ? novoId() : null;
  const agora = Date.now();
  return itens.map(
    (item, posicao): Conta => ({
      ...base,
      id: novoId(),
      mes: item.mes,
      centavos: item.centavos ?? base.centavos,
      paga: false,
      criadaEm: new Date(agora + posicao).toISOString(),
      grupo,
      parcela: item.parcela ?? null,
    }),
  );
}

function NovaConta({ mes }: { mes: string }) {
  const { campos, tipo, valor, erro, setErro, validar, limpar } = useCamposConta();
  const [mesPagamento, setMesPagamento] = useState(mes);
  const [parcelaAtual, setParcelaAtual] = useState("");
  const [parcelaTotal, setParcelaTotal] = useState("");
  const [futuros, setFuturos] = useState<string[]>([]);
  const formulario = useRef<HTMLFormElement>(null);

  const emprestimo = tipo === "Empréstimo";
  const cartao = tipo === "Cartão de crédito";
  const atual = Number(parcelaAtual || 1);
  const total = Number(parcelaTotal);
  const parcelado = emprestimo && parcelaTotal.trim() !== "";
  const parcelasValidas =
    Number.isInteger(atual) && Number.isInteger(total) && atual >= 1 && atual <= total && total <= 480;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const base = validar();
    if (!base) return;
    let novas: Conta[];
    if (parcelado) {
      if (!parcelasValidas) {
        setErro("Parcelas inválidas: a atual não pode passar do total (máximo 480).");
        return;
      }
      novas = lancamentos(
        base,
        Array.from({ length: total - atual + 1 }, (_, i) => ({
          mes: somarMeses(mesPagamento, i),
          parcela: { atual: atual + i, total },
        })),
      );
    } else {
      const valoresFuturos = cartao ? futuros.map((texto) => (texto.trim() ? paraCentavos(texto) : 0)) : [];
      if (valoresFuturos.some((centavos) => centavos === null)) {
        setErro("Algum valor dos próximos meses está inválido. Exemplo: 350,90");
        return;
      }
      novas = lancamentos(base, [
        { mes: mesPagamento },
        ...valoresFuturos.flatMap((centavos, i) =>
          centavos ? [{ mes: somarMeses(mesPagamento, i + 1), centavos }] : [],
        ),
      ]);
    }
    void adicionarContas(novas);
    avisarLancamento(novas, mes);
    limpar();
    setMesPagamento(mes);
    setParcelaAtual("");
    setParcelaTotal("");
    setFuturos([]);
    // Volta para a descrição: dá para cadastrar várias contas seguidas só no teclado.
    formulario.current?.querySelector("input")?.focus();
  }

  const opcoesDeMes = Array.from({ length: 27 }, (_, i) => somarMeses(mes, i - 2));
  const centavosValor = paraCentavos(valor);

  return (
    <form ref={formulario} onSubmit={enviar} className="p-4 sm:p-5">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_9rem_8.5rem_auto]">
        {campos}
        <select
          aria-label="Mês de pagamento"
          title="Mês de pagamento"
          value={mesPagamento}
          onChange={(e) => setMesPagamento(e.target.value)}
          className={estilo.campo}
        >
          {opcoesDeMes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {mesCurto(opcao)}
            </option>
          ))}
        </select>
        <button type="submit" className={estilo.botao}>
          <Plus className="size-4" />
          Adicionar
        </button>
      </div>

      {emprestimo && (
        <div className="mt-3 animate-entrar rounded-xl bg-plano p-3 text-sm sm:p-4">
          <p className="font-medium">Parcelamento</p>
          <div className="mt-2 flex items-center gap-2 text-tinta-2">
            Parcela
            <span className="w-20">
              <input
                aria-label="Parcela atual"
                inputMode="numeric"
                placeholder="1"
                value={parcelaAtual}
                onChange={(e) => setParcelaAtual(e.target.value.replace(/\D/g, ""))}
                className={`${estilo.campo} text-center`}
              />
            </span>
            de
            <span className="w-20">
              <input
                aria-label="Total de parcelas"
                inputMode="numeric"
                placeholder="24"
                value={parcelaTotal}
                onChange={(e) => setParcelaTotal(e.target.value.replace(/\D/g, ""))}
                className={`${estilo.campo} text-center`}
              />
            </span>
          </div>
          <p className="mt-2 text-xs text-tinta-3">
            {!parcelado
              ? "Deixe em branco para lançar só no mês escolhido."
              : !parcelasValidas
                ? "A parcela atual não pode passar do total (máximo 480)."
                : `Lança ${total - atual + 1} ${total - atual === 0 ? "parcela" : "parcelas"}, uma por mês, de ${mesCurto(mesPagamento)} a ${mesCurto(somarMeses(mesPagamento, total - atual))} (parcelas ${atual} a ${total})${
                    centavosValor ? `: ${formatar(centavosValor * (total - atual + 1))} no total` : ""
                  }.`}
          </p>
        </div>
      )}

      {cartao && (
        <div className="mt-3 animate-entrar rounded-xl bg-plano p-3 text-sm sm:p-4">
          <p className="font-medium">Próximos meses</p>
          <p className="text-xs text-tinta-3">
            O que já está comprometido nas faturas seguintes (compras parceladas). Deixe em branco os meses sem valor.
          </p>
          {futuros.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {futuros.map((texto, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-tinta-2">{mesCurto(somarMeses(mesPagamento, i + 1))}</span>
                  <div className="flex-1">
                    <CampoDinheiro
                      aria-label={`Valor em ${mesCurto(somarMeses(mesPagamento, i + 1))}`}
                      placeholder="0,00"
                      value={texto}
                      onChange={(e) =>
                        setFuturos((atuais) => atuais.map((v, j) => (j === i ? e.target.value : v)))
                      }
                    />
                  </div>
                  {i === futuros.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setFuturos((atuais) => atuais.slice(0, -1))}
                      aria-label="Tirar o último mês"
                      className={estilo.botaoIcone}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setFuturos((atuais) => [...atuais, ""])}
            className={`${estilo.botaoSecundario} mt-3`}
          >
            <Plus className="size-4" />
            Valor de {mesCurto(somarMeses(mesPagamento, futuros.length + 1))}
          </button>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-critico">{erro}</p>}
    </form>
  );
}

// Confirma o que foi lançado, principalmente quando cai fora do mês que está na tela.
function avisarLancamento(novas: Conta[], mesNaTela: string) {
  const primeira = novas[0];
  const ultima = novas[novas.length - 1];
  const fora = !novas.some((conta) => conta.mes === mesNaTela);
  const acoes = fora ? [{ texto: "Ver", executar: () => escolherMes(primeira.mes) }] : undefined;
  if (novas.length === 1) {
    if (fora) avisar(`“${primeira.descricao}” adicionada em ${mesPorExtenso(primeira.mes)}.`, { acoes });
    return;
  }
  avisar(
    `“${primeira.descricao}” lançada em ${novas.length} meses, de ${mesCurto(primeira.mes)} a ${mesCurto(ultima.mes)}.`,
    { acoes },
  );
}

function EdicaoConta({ conta, aoFechar }: { conta: Conta; aoFechar: () => void }) {
  const { campos, erro, validar } = useCamposConta(conta);

  function salvar(e: FormEvent) {
    e.preventDefault();
    const novos = validar();
    if (!novos) return;
    void atualizarConta(conta.id, novos);
    aoFechar();
  }

  return (
    <li className="bg-acento/5 px-4 py-3 sm:px-5">
      <form onSubmit={salvar} onKeyDown={(e) => e.key === "Escape" && aoFechar()} className={grade}>
        {campos}
        <div className="flex gap-2">
          <button type="submit" className={`${estilo.botao} flex-1`}>
            <Check className="size-4" />
            Salvar
          </button>
          <button type="button" onClick={aoFechar} aria-label="Cancelar edição" className={`${estilo.botaoIcone} size-10`}>
            <X className="size-4" />
          </button>
        </div>
      </form>
      {erro && <p className="mt-2 text-sm text-critico">{erro}</p>}
    </li>
  );
}

function LinhaConta({ conta, aoEditar }: { conta: Conta; aoEditar: () => void }) {
  const categoria = categoriaDe(conta);
  return (
    <li className="group flex animate-entrar items-center gap-3 px-4 py-3 transition-colors hover:bg-plano/60 sm:px-5">
      <button
        type="button"
        onClick={() => void atualizarConta(conta.id, { paga: !conta.paga })}
        aria-pressed={conta.paga}
        aria-label={`${conta.descricao}: ${conta.paga ? "paga" : "a pagar"}`}
        title={conta.paga ? "Marcar como a pagar" : "Marcar como paga"}
        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition ${
          conta.paga ? "border-bom bg-bom text-white" : "border-tinta-3/50 hover:border-bom"
        }`}
      >
        {conta.paga && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <span className="hidden sm:block">
        <IconeCategoria categoria={categoria} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${conta.paga ? "text-tinta-3 line-through" : ""}`}>
          {conta.descricao}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-tinta-3">
          <MarcaCategoria categoria={categoria} className="size-2" />
          {categoria}
          {conta.parcela && ` · parcela ${conta.parcela.atual} de ${conta.parcela.total}`}
          {conta.paga && " · paga"}
        </p>
      </div>
      <span className={`font-medium tabular-nums ${conta.paga ? "text-tinta-3" : ""}`}>
        {formatar(conta.centavos)}
      </span>
      <div className="flex transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <button type="button" onClick={aoEditar} aria-label={`Editar ${conta.descricao}`} className={estilo.botaoIcone}>
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void removerConta(conta)}
          aria-label={`Remover ${conta.descricao}`}
          className={`${estilo.botaoIcone} hover:text-critico`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
