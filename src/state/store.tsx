import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as db from '../lib/db';
import { countBy } from '../lib/text';
import { DEFAULT_SETTINGS, type Reel, type Settings } from '../types';

type Patch = Partial<Reel> | ((r: Reel) => Partial<Reel> | null);

export interface Store {
  ready: boolean;
  fatal: string | null;
  reels: Reel[];
  byId: ReadonlyMap<string, Reel>;
  settings: Settings;
  /** okamžite v UI, na pozadí do IndexedDB */
  update(id: string, patch: Patch): void;
  updateMany(ids: Iterable<string>, fn: (r: Reel) => Partial<Reel> | null): Promise<number>;
  /** najprv zapíše do IndexedDB, až potom ukáže (import) */
  putMany(reels: Reel[]): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(reels: Reel[], settings: Settings): Promise<void>;
  saveSettings(s: Settings | ((s: Settings) => Settings)): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider chýba');
  return s;
}

// zmeny v inej karte prehliadača -> načítaj znova
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bjj-reels') : null;

export function StoreProvider({ children, onError }: { children: ReactNode; onError: (msg: string) => void }) {
  const [byId, setById] = useState<ReadonlyMap<string, Reel>>(() => new Map());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const ref = useRef(byId);
  const sref = useRef(settings);
  const errRef = useRef(onError);
  errRef.current = onError;

  const commit = useCallback((m: ReadonlyMap<string, Reel>) => {
    ref.current = m;
    setById(m);
  }, []);
  const fail = useCallback((e: unknown) => {
    console.error(e);
    errRef.current(`Uloženie zlyhalo: ${e instanceof Error ? e.message : String(e)}`);
  }, []);
  const notify = () => channel?.postMessage('changed');

  const load = useCallback(async () => {
    try {
      const data = await db.loadAll();
      commit(new Map(data.reels.map((r) => [r.id, r])));
      sref.current = data.settings;
      setSettings(data.settings);
      setReady(true);
    } catch (e) {
      setFatal(`Prehliadač nepovolil úložisko (IndexedDB). ${e instanceof Error ? e.message : ''}`);
    }
  }, [commit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!channel) return;
    const h = () => void load();
    channel.addEventListener('message', h);
    return () => channel.removeEventListener('message', h);
  }, [load]);

  const update = useCallback(
    (id: string, patch: Patch) => {
      const cur = ref.current.get(id);
      if (!cur) return;
      const p = typeof patch === 'function' ? patch(cur) : patch;
      if (!p) return;
      const next: Reel = { ...cur, ...p, updatedAt: Date.now() };
      const m = new Map(ref.current);
      m.set(id, next);
      commit(m);
      db.putReels([next]).then(notify, fail);
    },
    [commit, fail],
  );

  const updateMany = useCallback(
    async (ids: Iterable<string>, fn: (r: Reel) => Partial<Reel> | null) => {
      const now = Date.now();
      const m = new Map(ref.current);
      const changed: Reel[] = [];
      for (const id of ids) {
        const cur = m.get(id);
        if (!cur) continue;
        const p = fn(cur);
        if (!p) continue;
        const next = { ...cur, ...p, updatedAt: now };
        m.set(id, next);
        changed.push(next);
      }
      if (!changed.length) return 0;
      commit(m);
      try {
        await db.putReels(changed);
        notify();
      } catch (e) {
        fail(e);
      }
      return changed.length;
    },
    [commit, fail],
  );

  const putMany = useCallback(
    async (reels: Reel[]) => {
      if (!reels.length) return;
      await db.putReels(reels);
      const m = new Map(ref.current);
      for (const r of reels) m.set(r.id, r);
      commit(m);
      notify();
    },
    [commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await db.deleteReel(id);
      const m = new Map(ref.current);
      m.delete(id);
      commit(m);
      notify();
    },
    [commit],
  );

  const replaceAll = useCallback(
    async (reels: Reel[], s: Settings) => {
      await db.replaceAll(reels, s);
      commit(new Map(reels.map((r) => [r.id, r])));
      sref.current = s;
      setSettings(s);
      notify();
    },
    [commit],
  );

  const saveSettings = useCallback(
    async (s: Settings | ((s: Settings) => Settings)) => {
      const next = typeof s === 'function' ? s(sref.current) : s;
      sref.current = next;
      setSettings(next);
      try {
        await db.saveSettings(next);
        notify();
      } catch (e) {
        fail(e);
      }
    },
    [fail],
  );

  const reels = useMemo(() => [...byId.values()], [byId]);
  const value = useMemo<Store>(
    () => ({ ready, fatal, reels, byId, settings, update, updateMany, putMany, remove, replaceAll, saveSettings }),
    [ready, fatal, reels, byId, settings, update, updateMany, putMany, remove, replaceAll, saveSettings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** tagy zoradené podľa početnosti (návrhy pri písaní) */
export function useTagSuggestions(): string[] {
  const { reels } = useStore();
  return useMemo(() => {
    const m = countBy(reels.flatMap((r) => r.tags));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [reels]);
}
