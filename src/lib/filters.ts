import type { Gi, Level, Reel, Status } from '../types';
import { fold } from './text';

export type Visibility = 'bjj' | 'hidden' | 'all';
export type SortKey = 'saved-desc' | 'saved-asc' | 'updated-desc' | 'author';

export interface Filters {
  q: string;
  positions: string[];
  types: string[];
  gi: Gi[];
  levels: Level[];
  statuses: Status[];
  tags: string[];
  igCollections: string[];
  author: string | null;
  favorite: boolean;
  unsorted: boolean;
  visibility: Visibility;
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  positions: [],
  types: [],
  gi: [],
  levels: [],
  statuses: [],
  tags: [],
  igCollections: [],
  author: null,
  favorite: false,
  unsorted: false,
  visibility: 'bjj',
};

export const SORT_LABEL: Record<SortKey, string> = {
  'saved-desc': 'Najnovšie',
  'saved-asc': 'Najstaršie',
  'updated-desc': 'Upravené',
  author: 'Autor A–Z',
};

type Field = keyof Filters;

/** "Netriedené" = nemá pozíciu ani typ. */
export const isUnsorted = (r: Reel) => r.positions.length === 0 && r.types.length === 0;

const hayCache = new WeakMap<Reel, string>();
/** Fulltext: poznámky, tagy, popis, hashtagy, autor, pozície, typy, IG kolekcie (bez diakritiky). */
export function haystack(r: Reel): string {
  let h = hayCache.get(r);
  if (h === undefined) {
    h = fold(
      [
        r.notes,
        r.tags.join(' '),
        r.caption,
        r.title,
        r.hashtags.map((t) => '#' + t).join(' '),
        r.author,
        r.authorName,
        r.positions.join(' '),
        r.types.join(' '),
        r.igCollections.join(' '),
      ]
        .filter(Boolean)
        .join('\n'),
    );
    hayCache.set(r, h);
  }
  return h;
}

const anyOf = (vals: readonly string[], sel: readonly string[]) => sel.some((s) => vals.includes(s));
/** filter "Gi" zahŕňa aj "Obe", filter "No-gi" tiež */
const giMatch = (g: Gi | null, sel: Gi[]) => sel.some((s) => g === s || (s !== 'both' && g === 'both'));

export function makeMatcher(f: Filters, skip?: Field): (r: Reel) => boolean {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  return (r) => {
    if (skip !== 'visibility' && f.visibility !== 'all' && (f.visibility === 'hidden') !== r.hidden) return false;
    if (skip !== 'unsorted' && f.unsorted && !isUnsorted(r)) return false;
    if (skip !== 'favorite' && f.favorite && !r.favorite) return false;
    if (skip !== 'statuses' && f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (skip !== 'positions' && f.positions.length && !anyOf(r.positions, f.positions)) return false;
    if (skip !== 'types' && f.types.length && !anyOf(r.types, f.types)) return false;
    if (skip !== 'gi' && f.gi.length && !giMatch(r.gi, f.gi)) return false;
    if (skip !== 'levels' && f.levels.length && !(r.level && f.levels.includes(r.level))) return false;
    if (skip !== 'tags' && f.tags.length && !anyOf(r.tags, f.tags)) return false;
    if (skip !== 'igCollections' && f.igCollections.length && !anyOf(r.igCollections, f.igCollections)) return false;
    if (skip !== 'author' && f.author && r.author !== f.author) return false;
    if (skip !== 'q' && words.length) {
      const h = haystack(r);
      if (!words.every((w) => h.includes(w))) return false;
    }
    return true;
  };
}

export function applyFilters(reels: Reel[], f: Filters): Reel[] {
  return reels.filter(makeMatcher(f));
}

export function activeFilterCount(f: Filters): number {
  return (
    f.positions.length +
    f.types.length +
    f.gi.length +
    f.levels.length +
    f.statuses.length +
    f.tags.length +
    f.igCollections.length +
    (f.author ? 1 : 0) +
    (f.favorite ? 1 : 0) +
    (f.unsorted ? 1 : 0) +
    (f.visibility !== 'bjj' ? 1 : 0)
  );
}

export interface Facets {
  positions: Map<string, number>;
  types: Map<string, number>;
  gi: Map<string, number>;
  levels: Map<string, number>;
  statuses: Map<string, number>;
  tags: Map<string, number>;
  igCollections: Map<string, number>;
  unsorted: number;
  favorite: number;
  visibility: Record<Visibility, number>;
}

/** Počty pre každú hodnotu filtra = koľko výsledkov by bolo, keby sa táto hodnota pridala (ostatné filtre platia). */
export function computeFacets(reels: Reel[], f: Filters): Facets {
  const count = (field: Field, keys: (r: Reel) => readonly string[]) => {
    const m = new Map<string, number>();
    const match = makeMatcher(f, field);
    for (const r of reels) if (match(r)) for (const k of keys(r)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const num = (field: Field, pred: (r: Reel) => boolean) => {
    const match = makeMatcher(f, field);
    let n = 0;
    for (const r of reels) if (match(r) && pred(r)) n++;
    return n;
  };
  const visMatch = makeMatcher(f, 'visibility');
  const visibility = { bjj: 0, hidden: 0, all: 0 };
  for (const r of reels) {
    if (!visMatch(r)) continue;
    visibility.all++;
    if (r.hidden) visibility.hidden++;
    else visibility.bjj++;
  }
  return {
    positions: count('positions', (r) => r.positions),
    types: count('types', (r) => r.types),
    gi: count('gi', (r) => (r.gi === 'both' ? ['gi', 'nogi', 'both'] : r.gi ? [r.gi] : [])),
    levels: count('levels', (r) => (r.level ? [r.level] : [])),
    statuses: count('statuses', (r) => [r.status]),
    tags: count('tags', (r) => r.tags),
    igCollections: count('igCollections', (r) => r.igCollections),
    unsorted: num('unsorted', isUnsorted),
    favorite: num('favorite', (r) => r.favorite),
    visibility,
  };
}

const savedTime = (r: Reel) => r.savedAt ?? r.addedAt;

export function sortReels(list: Reel[], key: SortKey): Reel[] {
  const a = [...list];
  switch (key) {
    case 'saved-asc':
      return a.sort((x, y) => savedTime(x) - savedTime(y));
    case 'updated-desc':
      return a.sort((x, y) => y.updatedAt - x.updatedAt);
    case 'author':
      return a.sort((x, y) => (x.author ?? '~').localeCompare(y.author ?? '~') || savedTime(y) - savedTime(x));
    default:
      return a.sort((x, y) => savedTime(y) - savedTime(x));
  }
}

export const byNewest = (x: Reel, y: Reel) => savedTime(y) - savedTime(x);
