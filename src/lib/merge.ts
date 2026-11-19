import type { Reel } from '../types';
import type { ExportItem, ParsedExport } from './igExport';
import { fold } from './text';

export interface Candidate extends ExportItem {
  igCollections: string[];
}

/** Zlúči príspevky zo saved_posts a z kolekcií do jedného záznamu na id. */
export function buildCandidates(p: ParsedExport): Map<string, Candidate> {
  const map = new Map<string, Candidate>();
  const add = (it: ExportItem) => {
    const ex = map.get(it.id);
    if (!ex) {
      map.set(it.id, { ...it, hashtags: [...it.hashtags], igCollections: [] });
      return;
    }
    ex.savedAt ??= it.savedAt;
    ex.caption ||= it.caption;
    ex.title ||= it.title;
    ex.author ||= it.author;
    ex.authorName ||= it.authorName;
    if (!ex.hashtags.length) ex.hashtags = [...it.hashtags];
  };
  for (const it of p.posts) add(it);
  for (const it of p.extraItems) add(it);
  for (const c of p.collections) {
    for (const id of c.ids) {
      const cand = map.get(id);
      if (cand && !cand.igCollections.includes(c.name)) cand.igCollections.push(c.name);
    }
  }
  return map;
}

// ---------- čo je BJJ ----------

export const BJJ_COLLECTION_RE = /bjj|jiu|jitsu|judo|grappl|wrestl|no-?gi|mma/i;

const BJJ_TEXT_RE = new RegExp(
  String.raw`\b(` +
    [
      'bjj',
      String.raw`jiu[\s-]?jitsu`,
      String.raw`ju[\s-]?jitsu`,
      String.raw`grappl\w*`,
      String.raw`no[\s-]?gi`,
      String.raw`submissions?`,
      String.raw`arm[\s-]?bars?`,
      'kimura',
      'omoplata',
      'americana',
      String.raw`rear[\s-]naked`,
      'rnc',
      'guillotine',
      String.raw`d'?arce`,
      'anaconda',
      'ezekiel',
      String.raw`heel[\s-]?hooks?`,
      String.raw`leg[\s-]?locks?`,
      String.raw`knee[\s-]?bar`,
      String.raw`toe[\s-]?hold`,
      String.raw`ankle[\s-]?lock`,
      'berimbolo',
      String.raw`de[\s-]la[\s-]riva`,
      String.raw`half[\s-]?guard`,
      String.raw`closed[\s-]guard`,
      String.raw`open[\s-]guard`,
      String.raw`butterfly[\s-]guard`,
      String.raw`x[\s-]guard`,
      String.raw`spider[\s-]guard`,
      String.raw`lasso[\s-]guard`,
      String.raw`guard[\s-]pass\w*`,
      String.raw`side[\s-]control`,
      String.raw`knee[\s-]on[\s-]belly`,
      String.raw`back[\s-]take`,
      String.raw`back[\s-]control`,
      String.raw`take[\s-]?downs?`,
      String.raw`single[\s-]leg`,
      String.raw`double[\s-]leg`,
      String.raw`wrestl\w*`,
      String.raw`judo\w*`,
      String.raw`uchi[\s-]?mata`,
      String.raw`o[\s-]?soto`,
      String.raw`seoi[\s-]?nage`,
      'adcc',
      'ibjjf',
      'gracie',
      String.raw`(?:black|purple|brown|blue)[\s-]?belt`,
      'tatami',
      'sparring',
      String.raw`underhooks?`,
      String.raw`overhooks?`,
      'whizzer',
      'crossface',
      String.raw`knee[\s-]?(?:cut|slice)`,
      String.raw`leg[\s-]drag`,
      String.raw`body[\s-]?lock`,
      String.raw`chokes?`,
    ].join('|') +
    String.raw`)\b`,
  'i',
);
/** podreťazce, ktoré v hashtagu alebo v mene autora znamenajú BJJ/grappling */
const BJJ_PART = ['bjj', 'jiujitsu', 'jujitsu', 'grappl', 'judo', 'wrestl', 'ibjjf', 'adcc', '柔道'];
/** hashtagy, ktoré musia takto začínať (inak falošné zhody, napr. #technologie obsahuje "nogi") */
const BJJ_HASHTAG_PREFIX = ['nogi', 'gracie', 'submission'];

/**
 * Heuristika pre príspevky bez IG kolekcie. Falošné zhody boli hlavne MMA/UFC klipy,
 * preto mma/ufc nie sú v zozname.
 */
export function looksLikeBjj(c: { caption?: string; title?: string; hashtags: string[]; author?: string }): boolean {
  const tags = c.hashtags.map(fold);
  if (tags.some((h) => BJJ_PART.some((p) => h.includes(p)) || BJJ_HASHTAG_PREFIX.some((p) => h.startsWith(p)))) return true;
  const author = fold(c.author ?? '');
  if (author && (author.includes('jiu') || BJJ_PART.some((p) => author.includes(p)))) return true;
  return BJJ_TEXT_RE.test(fold([c.caption, c.title].filter(Boolean).join(' ')));
}

export interface BjjRule {
  mode: 'smart' | 'all';
  collections: string[];
}

/**
 * smart: ak je príspevok v nejakej IG kolekcii, rozhodujú vybrané kolekcie;
 * ak nie je v žiadnej, rozhodnú hashtagy/popis.
 */
export function isBjj(c: Candidate, rule: BjjRule): boolean {
  if (rule.mode === 'all') return true;
  if (c.igCollections.length) return c.igCollections.some((n) => rule.collections.includes(n));
  return looksLikeBjj(c);
}

// ---------- záznamy ----------

export function newReel(base: Pick<Reel, 'id' | 'url' | 'kind'> & Partial<Reel>, now = Date.now()): Reel {
  return {
    hashtags: [],
    igCollections: [],
    positions: [],
    types: [],
    tags: [],
    notes: '',
    status: 'new',
    favorite: false,
    hidden: false,
    gi: null,
    level: null,
    source: 'manual',
    addedAt: now,
    updatedAt: now,
    ...base,
  };
}

function reelFromCandidate(c: Candidate, hidden: boolean, now: number): Reel {
  return newReel(
    {
      id: c.id,
      url: c.url,
      kind: c.kind,
      author: c.author,
      authorName: c.authorName,
      caption: c.caption,
      title: c.title,
      hashtags: c.hashtags,
      igCollections: c.igCollections,
      savedAt: c.savedAt,
      source: 'export',
      hidden,
    },
    now,
  );
}

/** Existujúci záznam: doplní len prázdne údaje z exportu a nové IG kolekcie. Moje polia nikdy nemení. */
function enrich(cur: Reel, c: Candidate): Reel {
  const patch: Partial<Reel> = {};
  if (!cur.author && c.author) patch.author = c.author;
  if (!cur.authorName && c.authorName) patch.authorName = c.authorName;
  if (!cur.caption && c.caption) patch.caption = c.caption;
  if (!cur.title && c.title) patch.title = c.title;
  if (!cur.hashtags.length && c.hashtags.length) patch.hashtags = c.hashtags;
  if (!cur.savedAt && c.savedAt) patch.savedAt = c.savedAt;
  const cols = c.igCollections.filter((n) => !cur.igCollections.includes(n));
  if (cols.length) patch.igCollections = [...cur.igCollections, ...cols];
  return Object.keys(patch).length ? { ...cur, ...patch } : cur;
}

export interface ImportPlan {
  toPut: Reel[];
  added: number;
  addedBjj: number;
  existing: number;
  enriched: number;
}

export function planImport(
  existing: ReadonlyMap<string, Reel>,
  cands: ReadonlyMap<string, Candidate>,
  rule: BjjRule,
  now = Date.now(),
): ImportPlan {
  const plan: ImportPlan = { toPut: [], added: 0, addedBjj: 0, existing: 0, enriched: 0 };
  for (const c of cands.values()) {
    const cur = existing.get(c.id);
    if (!cur) {
      const bjj = isBjj(c, rule);
      plan.toPut.push(reelFromCandidate(c, !bjj, now));
      plan.added++;
      if (bjj) plan.addedBjj++;
      continue;
    }
    plan.existing++;
    const next = enrich(cur, c);
    if (next !== cur) {
      plan.toPut.push(next);
      plan.enriched++;
    }
  }
  return plan;
}

/** predvoľba BJJ kolekcií: zapamätaný výber + nové kolekcie podľa názvu */
export function defaultBjjSelection(names: string[], remembered: string[] | null, known: string[]): string[] {
  if (!remembered) return names.filter((n) => BJJ_COLLECTION_RE.test(n));
  return names.filter((n) => remembered.includes(n) || (!known.includes(n) && BJJ_COLLECTION_RE.test(n)));
}
