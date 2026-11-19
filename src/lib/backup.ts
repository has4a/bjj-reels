import { GIS, LEVELS, STATUSES, type Gi, type Level, type Reel, type ReelKind, type Settings, type Status } from '../types';
import { uniq } from './text';

export const BACKUP_APP = 'bjj-reels';
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  settings: Pick<Settings, 'positions' | 'types' | 'bjjCollections' | 'knownCollections'>;
  reels: Reel[];
}

export function makeBackup(reels: Reel[], settings: Settings, now = new Date()): Backup {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    settings: {
      positions: settings.positions,
      types: settings.types,
      bjjCollections: settings.bjjCollections,
      knownCollections: settings.knownCollections,
    },
    reels,
  };
}

const KINDS: ReelKind[] = ['reel', 'p', 'tv', 'share', 'other'];
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? uniq(v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)) : [];
const optStr = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const optNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/** Overí a doplní záznam zo zálohy – neznáme polia zahodí, chybné nahradí predvolenými. */
export function sanitizeReel(raw: unknown, now = Date.now()): Reel | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.url !== 'string' || !r.url) return null;
  return {
    id: r.id,
    url: r.url,
    kind: KINDS.includes(r.kind as ReelKind) ? (r.kind as ReelKind) : 'other',
    author: optStr(r.author),
    authorName: optStr(r.authorName),
    caption: optStr(r.caption),
    title: optStr(r.title),
    hashtags: strArr(r.hashtags),
    igCollections: strArr(r.igCollections),
    savedAt: optNum(r.savedAt),
    addedAt: optNum(r.addedAt) ?? now,
    updatedAt: optNum(r.updatedAt) ?? now,
    source: r.source === 'manual' ? 'manual' : 'export',
    positions: strArr(r.positions),
    types: strArr(r.types),
    gi: GIS.includes(r.gi as Gi) ? (r.gi as Gi) : null,
    level: LEVELS.includes(r.level as Level) ? (r.level as Level) : null,
    tags: strArr(r.tags),
    notes: typeof r.notes === 'string' ? r.notes : '',
    status: STATUSES.includes(r.status as Status) ? (r.status as Status) : 'new',
    favorite: r.favorite === true,
    hidden: r.hidden === true,
  };
}

export interface ParsedBackup {
  exportedAt?: string;
  settings: Partial<Settings>;
  reels: Reel[];
  skipped: number;
}

export function parseBackup(json: unknown): ParsedBackup {
  const b = json as Record<string, unknown> | null;
  if (!b || typeof b !== 'object' || b.app !== BACKUP_APP || !Array.isArray(b.reels)) {
    throw new Error('Toto nie je záloha z BJJ Reels.');
  }
  if (typeof b.format === 'number' && b.format > BACKUP_FORMAT) {
    throw new Error('Záloha je z novšej verzie appky – najprv appku aktualizuj.');
  }
  const reels: Reel[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const raw of b.reels) {
    const r = sanitizeReel(raw);
    if (r && !seen.has(r.id)) {
      seen.add(r.id);
      reels.push(r);
    } else skipped++;
  }
  const s = (b.settings && typeof b.settings === 'object' ? b.settings : {}) as Record<string, unknown>;
  const settings: Partial<Settings> = {};
  if (Array.isArray(s.positions)) settings.positions = strArr(s.positions);
  if (Array.isArray(s.types)) settings.types = strArr(s.types);
  if (Array.isArray(s.bjjCollections)) settings.bjjCollections = strArr(s.bjjCollections);
  if (Array.isArray(s.knownCollections)) settings.knownCollections = strArr(s.knownCollections);
  return { exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : undefined, settings, reels, skipped };
}

export interface BackupMerge {
  toPut: Reel[];
  added: number;
  updated: number;
  kept: number;
}

/** Zlúčenie: nové pridá, pri existujúcich vyhrá novšia úprava (updatedAt). */
export function mergeBackup(existing: ReadonlyMap<string, Reel>, incoming: Reel[]): BackupMerge {
  const res: BackupMerge = { toPut: [], added: 0, updated: 0, kept: 0 };
  for (const r of incoming) {
    const cur = existing.get(r.id);
    if (!cur) {
      res.toPut.push(r);
      res.added++;
    } else if (r.updatedAt > cur.updatedAt) {
      res.toPut.push({ ...r, igCollections: uniq([...cur.igCollections, ...r.igCollections]) });
      res.updated++;
    } else res.kept++;
  }
  return res;
}

/** a + položky z b, ktoré v a ešte nie sú (bez ohľadu na veľkosť písmen) */
export function mergeLists(a: string[], b: string[]): string[] {
  const seen = new Set(a.map((x) => x.toLowerCase()));
  const out = [...a];
  for (const x of b) {
    const k = x.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}
