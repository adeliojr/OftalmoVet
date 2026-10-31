import { FichaPaciente } from '../types';

export const FichasDB = {
  _db: null as IDBDatabase | null,

  async _abrir(): Promise<IDBDatabase> {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        return reject(new Error('Este navegador não suporta armazenamento IndexedDB local.'));
      }
      const req = indexedDB.open('hva_oftalmovet', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('fichas', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        this._db = req.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error || new Error('Falha ao abrir banco de dados local.'));
    });
  },

  async _tx<T>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this._abrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fichas', modo);
      const req = fn(tx.objectStore('fichas'));
      tx.oncomplete = () => resolve(req.result as T);
      tx.onerror = () => reject(tx.error || new Error('Erro na transação com o armazenamento local.'));
      tx.onabort = () => reject(tx.error || new Error('Transação cancelada. Verifique o espaço em disco.'));
    });
  },

  async listar(): Promise<FichaPaciente[]> {
    return (await this._tx<FichaPaciente[]>('readonly', (st) => st.getAll())) || [];
  },

  async obter(id: string): Promise<FichaPaciente | undefined> {
    return await this._tx<FichaPaciente | undefined>('readonly', (st) => st.get(id));
  },

  async salvar(ficha: FichaPaciente): Promise<void> {
    await this._tx('readwrite', (st) => st.put(ficha));
  },

  async excluir(id: string): Promise<void> {
    await this._tx('readwrite', (st) => st.delete(id));
  },
};

export function hojeISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fmtData(iso?: string): string {
  if (!iso) return 'sem data';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

export function normalizarTexto(s?: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function novoId(): string {
  if (typeof window !== 'undefined' && window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
