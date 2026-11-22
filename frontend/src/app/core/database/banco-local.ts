import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

export type TabelaOffline = 'alunos' | 'professores' | 'avaliacoes' | 'resultados';
export type TipoOperacaoOffline = 'criar' | 'atualizar' | 'excluir';

export interface OperacaoPendente {
  id: string;
  entidade: TabelaOffline;
  registroId: string;
  operacao: TipoOperacaoOffline;
  dados: unknown | null;
  criadaEm: string;
}

@Injectable({ providedIn: 'root' })
export class BancoLocal {
  private readonly nomeBanco = 'provaviva';
  private readonly conexaoSQLite = new SQLiteConnection(CapacitorSQLite);
  private conexao?: SQLiteDBConnection;
  private inicializacao?: Promise<SQLiteDBConnection>;

  async inicializar(): Promise<void> {
    await this.obterConexao();
  }

  async salvar<T>(tabela: TabelaOffline, id: string | number, dados: T): Promise<void> {
    const conexao = await this.obterConexao();
    await conexao.run(
      `INSERT INTO ${tabela} (id, dados, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em`,
      [String(id), JSON.stringify(dados), new Date().toISOString()],
    );
  }

  async buscar<T>(tabela: TabelaOffline, id: string | number): Promise<T | null> {
    const conexao = await this.obterConexao();
    const resultado = await conexao.query(`SELECT dados FROM ${tabela} WHERE id = ?`, [String(id)]);
    const linha = resultado.values?.[0] as { dados: string } | undefined;
    return linha ? (JSON.parse(linha.dados) as T) : null;
  }

  async listar<T>(tabela: TabelaOffline): Promise<T[]> {
    const conexao = await this.obterConexao();
    const resultado = await conexao.query(`SELECT dados FROM ${tabela} ORDER BY atualizado_em DESC`);
    return (resultado.values ?? []).map((linha) => JSON.parse((linha as { dados: string }).dados) as T);
  }

  async excluir(tabela: TabelaOffline, id: string | number): Promise<void> {
    const conexao = await this.obterConexao();
    await conexao.run(`DELETE FROM ${tabela} WHERE id = ?`, [String(id)]);
  }

  async enfileirarOperacao(
    entidade: TabelaOffline,
    registroId: string | number,
    operacao: TipoOperacaoOffline,
    dados: unknown | null,
  ): Promise<string> {
    const conexao = await this.obterConexao();
    const id = crypto.randomUUID();
    const criadaEm = new Date().toISOString();
    await conexao.run(
      'INSERT INTO operacoes_pendentes (id, entidade, registro_id, operacao, dados, criada_em) VALUES (?, ?, ?, ?, ?, ?)',
      [id, entidade, String(registroId), operacao, dados === null ? null : JSON.stringify(dados), criadaEm],
    );
    return id;
  }

  async listarOperacoesPendentes(): Promise<OperacaoPendente[]> {
    const conexao = await this.obterConexao();
    const resultado = await conexao.query(
      'SELECT id, entidade, registro_id, operacao, dados, criada_em FROM operacoes_pendentes ORDER BY criada_em',
    );
    return (resultado.values ?? []).map((linha) => {
      const registro = linha as {
        id: string;
        entidade: TabelaOffline;
        registro_id: string;
        operacao: TipoOperacaoOffline;
        dados: string | null;
        criada_em: string;
      };
      return {
        id: registro.id,
        entidade: registro.entidade,
        registroId: registro.registro_id,
        operacao: registro.operacao,
        dados: registro.dados === null ? null : JSON.parse(registro.dados),
        criadaEm: registro.criada_em,
      };
    });
  }

  async concluirOperacao(id: string): Promise<void> {
    const conexao = await this.obterConexao();
    await conexao.run('DELETE FROM operacoes_pendentes WHERE id = ?', [id]);
  }

  private async obterConexao(): Promise<SQLiteDBConnection> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('O banco SQLite está configurado para o aplicativo Android nativo.');
    }

    if (this.conexao) return this.conexao;
    this.inicializacao ??= this.criarConexao();
    try {
      this.conexao = await this.inicializacao;
      return this.conexao;
    } catch (erro) {
      this.inicializacao = undefined;
      throw erro;
    }
  }

  private async criarConexao(): Promise<SQLiteDBConnection> {
    const conexao = await this.conexaoSQLite.createConnection(this.nomeBanco, false, 'no-encryption', 1, false);
    await conexao.open();
    await conexao.execute(`
      CREATE TABLE IF NOT EXISTS alunos (
        id TEXT PRIMARY KEY NOT NULL,
        dados TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS professores (
        id TEXT PRIMARY KEY NOT NULL,
        dados TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id TEXT PRIMARY KEY NOT NULL,
        dados TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resultados (
        id TEXT PRIMARY KEY NOT NULL,
        dados TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS operacoes_pendentes (
        id TEXT PRIMARY KEY NOT NULL,
        entidade TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        operacao TEXT NOT NULL,
        dados TEXT,
        criada_em TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_operacoes_pendentes_criadas_em
        ON operacoes_pendentes (criada_em);
    `);
    return conexao;
  }
}
