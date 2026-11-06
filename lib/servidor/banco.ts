import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { contasParaCopiar } from "@/lib/calculos";
import {
  PLANEJAMENTO_PADRAO,
  type Conta,
  type Dados,
  type Planejamento,
  type Recebimentos,
  type TipoConta,
} from "@/lib/financas";

// Na VM fica em /var/lib/minhasfinancas: o deploy apaga e recria a pasta do app.
const ARQUIVO =
  process.env.BANCO_ARQUIVO ?? path.join(process.cwd(), "dados", "minhasfinancas.db");

// Dados cadastrados antes de o app ter login. Ficam com a primeira conta criada.
const SEM_DONO = 0;

function abrir() {
  mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const db = new DatabaseSync(ARQUIVO);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY,
      usuario    TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      criado_em  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token_hash TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      expira_em  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contas (
      id         TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL DEFAULT 0,
      mes        TEXT NOT NULL,
      descricao  TEXT NOT NULL,
      tipo       TEXT,
      centavos   INTEGER NOT NULL CHECK (centavos > 0),
      paga       INTEGER NOT NULL DEFAULT 0,
      criada_em  TEXT NOT NULL,
      grupo         TEXT,
      parcela_atual INTEGER,
      parcela_total INTEGER
    );
    CREATE TABLE IF NOT EXISTS recebimentos (
      usuario_id      INTEGER NOT NULL DEFAULT 0,
      mes             TEXT NOT NULL,
      quinto_dia_util INTEGER NOT NULL,
      dia20           INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, mes)
    );
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);
  separarPorUsuario(db);
  permitirSeries(db);
  db.exec(`
    DROP INDEX IF EXISTS contas_por_mes;
    CREATE INDEX IF NOT EXISTS contas_por_usuario ON contas (usuario_id, mes);
  `);
  return db;
}

// Bancos de antes do login: contas e recebimentos ganham dono (SEM_DONO por
// enquanto) e o planejamento, que era um só, passa a ser guardado por usuário.
function separarPorUsuario(db: DatabaseSync) {
  const temDono = (tabela: string) =>
    (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).some(
      (coluna) => coluna.name === "usuario_id",
    );
  if (temDono("contas") && temDono("recebimentos")) return;
  emTransacao(db, () => {
    if (!temDono("contas")) {
      db.exec(`ALTER TABLE contas ADD COLUMN usuario_id INTEGER NOT NULL DEFAULT ${SEM_DONO}`);
    }
    if (!temDono("recebimentos")) {
      // A chave primária muda (de mes para usuario_id + mes): só recriando a tabela.
      db.exec(`
        CREATE TABLE recebimentos_por_usuario (
          usuario_id      INTEGER NOT NULL DEFAULT 0,
          mes             TEXT NOT NULL,
          quinto_dia_util INTEGER NOT NULL,
          dia20           INTEGER NOT NULL,
          PRIMARY KEY (usuario_id, mes)
        );
        INSERT INTO recebimentos_por_usuario (usuario_id, mes, quinto_dia_util, dia20)
          SELECT ${SEM_DONO}, mes, quinto_dia_util, dia20 FROM recebimentos;
        DROP TABLE recebimentos;
        ALTER TABLE recebimentos_por_usuario RENAME TO recebimentos;
      `);
    }
    db.exec(`UPDATE configuracoes SET chave = 'planejamento:${SEM_DONO}' WHERE chave = 'planejamento'`);
  });
}

// Bancos de antes das parcelas: as colunas novas entram vazias nas contas existentes.
function permitirSeries(db: DatabaseSync) {
  const colunas = (db.prepare("PRAGMA table_info(contas)").all() as { name: string }[]).map(
    (coluna) => coluna.name,
  );
  for (const [nome, tipo] of [["grupo", "TEXT"], ["parcela_atual", "INTEGER"], ["parcela_total", "INTEGER"]]) {
    if (!colunas.includes(nome)) db.exec(`ALTER TABLE contas ADD COLUMN ${nome} ${tipo}`);
  }
}

function emTransacao<T>(db: DatabaseSync, acao: () => T): T {
  db.exec("BEGIN");
  try {
    const resultado = acao();
    db.exec("COMMIT");
    return resultado;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

// Aberto só no primeiro uso (o build importa este módulo) e uma vez por processo.
const global = globalThis as { bancoMinhasFinancas?: DatabaseSync };
const banco = () => (global.bancoMinhasFinancas ??= abrir());

// ---- Usuários e sessões ----

export type Usuario = { id: number; usuario: string };

export const existeUsuario = () =>
  Boolean(banco().prepare("SELECT 1 FROM usuarios LIMIT 1").get());

// null se o nome de usuário já existe. A primeira conta criada fica com os
// dados cadastrados antes do login.
export function criarUsuario(usuario: string, senhaHash: string): number | null {
  const db = banco();
  return emTransacao(db, () => {
    if (db.prepare("SELECT 1 FROM usuarios WHERE usuario = ?").get(usuario)) return null;
    const primeiro = !existeUsuario();
    const { lastInsertRowid } = db
      .prepare("INSERT INTO usuarios (usuario, senha_hash, criado_em) VALUES (?, ?, ?)")
      .run(usuario, senhaHash, new Date().toISOString());
    const id = Number(lastInsertRowid);
    if (primeiro) {
      db.prepare("UPDATE contas SET usuario_id = ? WHERE usuario_id = ?").run(id, SEM_DONO);
      db.prepare("UPDATE recebimentos SET usuario_id = ? WHERE usuario_id = ?").run(id, SEM_DONO);
      db.prepare("UPDATE configuracoes SET chave = ? WHERE chave = ?").run(
        `planejamento:${id}`,
        `planejamento:${SEM_DONO}`,
      );
    }
    return id;
  });
}

export function buscarUsuario(usuario: string) {
  return banco().prepare("SELECT id, senha_hash FROM usuarios WHERE usuario = ?").get(usuario) as
    | { id: number; senha_hash: string }
    | undefined;
}

// O cookie leva o token; o banco guarda só o hash dele.
const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function criarSessao(usuarioId: number, duracaoSegundos: number) {
  const token = randomBytes(32).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  banco().prepare("DELETE FROM sessoes WHERE expira_em < ?").run(agora);
  banco()
    .prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)")
    .run(hashDoToken(token), usuarioId, agora + duracaoSegundos);
  return token;
}

export function usuarioDaSessao(token: string): Usuario | null {
  const linha = banco()
    .prepare(
      `SELECT u.id, u.usuario FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = ? AND s.expira_em > ?`,
    )
    .get(hashDoToken(token), Math.floor(Date.now() / 1000)) as Usuario | undefined;
  return linha ?? null;
}

export function apagarSessao(token: string) {
  banco().prepare("DELETE FROM sessoes WHERE token_hash = ?").run(hashDoToken(token));
}

// ---- Dados de cada usuário ----

type LinhaConta = {
  id: string;
  mes: string;
  descricao: string;
  tipo: string | null;
  centavos: number;
  paga: number;
  criada_em: string;
  grupo: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
};

const paraConta = (linha: LinhaConta): Conta => ({
  id: linha.id,
  mes: linha.mes,
  descricao: linha.descricao,
  tipo: linha.tipo as TipoConta | null,
  centavos: linha.centavos,
  paga: linha.paga === 1,
  criadaEm: linha.criada_em,
  grupo: linha.grupo,
  parcela:
    linha.parcela_atual && linha.parcela_total
      ? { atual: linha.parcela_atual, total: linha.parcela_total }
      : null,
});

function lerContas(usuarioId: number, mes: string) {
  const linhas = banco()
    .prepare("SELECT * FROM contas WHERE usuario_id = ? AND mes = ? ORDER BY criada_em, rowid")
    .all(usuarioId, mes) as unknown as LinhaConta[];
  return linhas.map(paraConta);
}

function lerRecebimentos(usuarioId: number, mes: string): Recebimentos | undefined {
  const linha = banco()
    .prepare("SELECT quinto_dia_util, dia20 FROM recebimentos WHERE usuario_id = ? AND mes = ?")
    .get(usuarioId, mes) as { quinto_dia_util: number; dia20: number } | undefined;
  return linha && { quintoDiaUtil: linha.quinto_dia_util, dia20: linha.dia20 };
}

export function lerDados(usuario: Usuario): Dados {
  const contas = banco()
    .prepare("SELECT * FROM contas WHERE usuario_id = ? ORDER BY mes, criada_em, rowid")
    .all(usuario.id) as unknown as LinhaConta[];
  const recebimentos = banco()
    .prepare("SELECT mes, quinto_dia_util, dia20 FROM recebimentos WHERE usuario_id = ?")
    .all(usuario.id) as { mes: string; quinto_dia_util: number; dia20: number }[];
  const planejamento = banco()
    .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
    .get(`planejamento:${usuario.id}`) as { valor: string } | undefined;
  return {
    usuario: usuario.usuario,
    contas: contas.map(paraConta),
    recebimentos: Object.fromEntries(
      recebimentos.map((r) => [r.mes, { quintoDiaUtil: r.quinto_dia_util, dia20: r.dia20 }]),
    ),
    planejamento: { ...PLANEJAMENTO_PADRAO, ...(planejamento && JSON.parse(planejamento.valor)) },
  };
}

// false se já existe uma conta com o mesmo id.
function inserirConta(usuarioId: number, conta: Conta) {
  const resultado = banco()
    .prepare(
      `INSERT OR IGNORE INTO contas
         (id, usuario_id, mes, descricao, tipo, centavos, paga, criada_em, grupo, parcela_atual, parcela_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      conta.id,
      usuarioId,
      conta.mes,
      conta.descricao,
      conta.tipo,
      conta.centavos,
      conta.paga ? 1 : 0,
      conta.criadaEm,
      conta.grupo,
      conta.parcela?.atual ?? null,
      conta.parcela?.total ?? null,
    );
  return resultado.changes === 1;
}

class IdRepetido extends Error {}

// Tudo ou nada: uma série de parcelas não fica pela metade. false se algum id já existe.
export function inserirContas(usuarioId: number, contas: Conta[]) {
  const db = banco();
  try {
    return emTransacao(db, () => {
      if (!contas.every((conta) => inserirConta(usuarioId, conta))) throw new IdRepetido();
      return true;
    });
  } catch (erro) {
    if (erro instanceof IdRepetido) return false;
    throw erro;
  }
}

export type CamposConta = Partial<Pick<Conta, "descricao" | "tipo" | "centavos" | "paga">>;

// Só altera ou apaga contas do próprio usuário.
export function atualizarConta(usuarioId: number, id: string, campos: CamposConta): Conta | null {
  const linha = banco()
    .prepare("SELECT * FROM contas WHERE id = ? AND usuario_id = ?")
    .get(id, usuarioId) as LinhaConta | undefined;
  if (!linha) return null;
  const conta = { ...paraConta(linha), ...campos };
  banco()
    .prepare("UPDATE contas SET descricao = ?, tipo = ?, centavos = ?, paga = ? WHERE id = ?")
    .run(conta.descricao, conta.tipo, conta.centavos, conta.paga ? 1 : 0, id);
  return conta;
}

export function removerConta(usuarioId: number, id: string) {
  return (
    banco().prepare("DELETE FROM contas WHERE id = ? AND usuario_id = ?").run(id, usuarioId)
      .changes === 1
  );
}

// Apaga o restante de uma série (parcelas ou valores futuros do cartão) a partir de um mês.
export function removerGrupo(usuarioId: number, grupo: string, desde: string) {
  return Number(
    banco()
      .prepare("DELETE FROM contas WHERE usuario_id = ? AND grupo = ? AND mes >= ?")
      .run(usuarioId, grupo, desde).changes,
  );
}

export function gravarRecebimentos(usuarioId: number, mes: string, { quintoDiaUtil, dia20 }: Recebimentos) {
  banco()
    .prepare(
      `INSERT INTO recebimentos (usuario_id, mes, quinto_dia_util, dia20) VALUES (?, ?, ?, ?)
       ON CONFLICT (usuario_id, mes) DO UPDATE
         SET quinto_dia_util = excluded.quinto_dia_util, dia20 = excluded.dia20`,
    )
    .run(usuarioId, mes, quintoDiaUtil, dia20);
}

export function gravarPlanejamento(usuarioId: number, planejamento: Planejamento) {
  banco()
    .prepare(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
    )
    .run(`planejamento:${usuarioId}`, JSON.stringify(planejamento));
}

// Leva para "para" as contas de "de" que se repetem (ver contasParaCopiar), todas
// "a pagar", e os recebimentos se o destino ainda não tiver. Devolve quantas copiou.
export function copiarMes(usuarioId: number, de: string, para: string) {
  return emTransacao(banco(), () => {
    const agora = Date.now();
    const copiadas = contasParaCopiar(lerContas(usuarioId, de), lerContas(usuarioId, para));
    copiadas.forEach((conta, posicao) =>
      inserirConta(usuarioId, {
        ...conta,
        id: randomUUID(),
        mes: para,
        paga: false,
        grupo: null,
        criadaEm: new Date(agora + posicao).toISOString(), // mantém a ordem
      }),
    );
    const recebimentos = lerRecebimentos(usuarioId, de);
    const levarRecebimentos = recebimentos !== undefined && !lerRecebimentos(usuarioId, para);
    if (levarRecebimentos) gravarRecebimentos(usuarioId, para, recebimentos);
    return { contas: copiadas.length, recebimentos: levarRecebimentos };
  });
}
