import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS, type Reel, type Settings } from '../types';

interface Schema extends DBSchema {
  reels: { key: string; value: Reel };
  kv: { key: string; value: unknown };
}

const DB_NAME = 'bjj-reels';
let dbp: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  dbp ??= openDB<Schema>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('reels', { keyPath: 'id' });
      d.createObjectStore('kv');
    },
    // iná karta chce DB aktualizovať/zmazať -> pusti ju, pri ďalšom prístupe sa znova otvorí
    blocking() {
      const p = dbp;
      dbp = null;
      void p?.then((d) => d.close());
    },
    terminated() {
      dbp = null;
    },
  });
  return dbp;
}

export async function loadAll(): Promise<{ reels: Reel[]; settings: Settings }> {
  const d = await db();
  const [reels, s] = await Promise.all([d.getAll('reels'), d.get('kv', 'settings')]);
  return { reels, settings: { ...DEFAULT_SETTINGS, ...((s as Partial<Settings> | undefined) ?? {}) } };
}

export async function putReels(reels: Reel[]): Promise<void> {
  if (!reels.length) return;
  const tx = (await db()).transaction('reels', 'readwrite');
  await Promise.all([...reels.map((r) => tx.store.put(r)), tx.done]);
}

export async function deleteReel(id: string): Promise<void> {
  await (await db()).delete('reels', id);
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await db()).put('kv', s, 'settings');
}

/** Nahradí všetky dáta (obnova zálohy / vymazanie) v jednej transakcii. */
export async function replaceAll(reels: Reel[], settings: Settings): Promise<void> {
  const tx = (await db()).transaction(['reels', 'kv'], 'readwrite');
  const store = tx.objectStore('reels');
  await Promise.all([store.clear(), ...reels.map((r) => store.put(r)), tx.objectStore('kv').put(settings, 'settings'), tx.done]);
}

/** Požiada prehliadač, aby dáta nemazal pri nedostatku miesta. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
