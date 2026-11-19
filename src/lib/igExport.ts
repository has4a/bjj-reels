/**
 * Parser oficiálneho Instagram exportu (Stiahnuť tvoje informácie, formát JSON).
 *
 * Reálna štruktúra (overená na exporte z 11/2026, lokalizovaná do slovenčiny):
 *  saved_posts.json:       [{ timestamp, media: [], label_values: [
 *                              {label:"URL", value, href}, {label:"Titulok", value}, {label:"Názov", value},
 *                              {title:"Hashtagy", dict:[{dict:[{label:"Meno", value}]}]},
 *                              {title:"Vlastník", dict:[{dict:[{label:"URL"},{label:"Meno"},{label:"Používateľské meno"}]}]},
 *                              {title:"Značkový partner", dict:[...]} ] }]
 *  saved_collections.json: [{ timestamp, label_values: [
 *                              {label:"Meno"}, {label:"Typ"}, {label:"Súkromie"}, {label:"Čas aktualizácie", timestamp_value},
 *                              {title:"Médiá", dict:[{dict:[ ...rovnaké polia ako príspevok, bez času... ]}]} ] }]
 * Texty sú v "mojibake" kódovaní (UTF-8 bajty ako \u00XX) – opravuje fixMojibake.
 * Názvy polí sú lokalizované; podporujeme SK + EN, URL sa hľadá aj podľa "href" (nezávisle od jazyka).
 */
import type { ReelKind } from '../types';
import { fixMojibake, uniq } from './text';
import { parseLink, type ParsedLink } from './url';

interface LV {
  label?: unknown;
  value?: unknown;
  href?: unknown;
  timestamp_value?: unknown;
  title?: unknown;
  dict?: LV[];
}
interface RawEntry {
  timestamp?: unknown;
  label_values?: LV[];
}

export interface ExportItem {
  id: string;
  url: string;
  kind: ReelKind;
  savedAt?: number;
  caption?: string;
  title?: string;
  hashtags: string[];
  author?: string;
  authorName?: string;
}

export interface ExportCollection {
  name: string;
  createdAt?: number;
  updatedAt?: number;
  ids: string[];
}

export interface ParsedFile {
  name: string;
  kind: 'posts' | 'collections' | 'mixed' | 'fallback' | 'empty';
  posts: number;
  collections: number;
}

export interface ParsedExport {
  /** príspevky zo saved_posts (majú čas uloženia) */
  posts: ExportItem[];
  collections: ExportCollection[];
  /** príspevky nájdené len v kolekciách alebo náhradným spôsobom */
  extraItems: ExportItem[];
  files: ParsedFile[];
  warnings: string[];
}

const ALIASES = {
  url: ['url'],
  caption: ['titulok', 'caption'],
  title: ['názov', 'title', 'název'],
  hashtags: ['hashtagy', 'hashtags'],
  owner: ['vlastník', 'owner'],
  username: ['používateľské meno', 'username', 'uživatelské jméno'],
  name: ['meno', 'name', 'jméno'],
} as const;
type AliasKey = keyof typeof ALIASES;

const lbl = (s: unknown) => (typeof s === 'string' ? fixMojibake(s).trim().toLowerCase() : '');
const str = (v: unknown) => (typeof v === 'string' ? fixMojibake(v).trim() : '');
const is = (key: AliasKey, s: unknown) => (ALIASES[key] as readonly string[]).includes(lbl(s));
const isGroup = (it: LV): it is LV & { dict: LV[] } => Array.isArray(it.dict);
const tsToMs = (t: unknown) => (typeof t === 'number' && t > 0 ? t * 1000 : undefined);

/** {label: value} z plochého zoznamu */
function fields(list: LV[] | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const it of list ?? []) {
    if (isGroup(it)) continue;
    const k = lbl(it.label);
    if (k && !m.has(k)) m.set(k, str(it.value));
  }
  return m;
}

function pick(m: Map<string, string>, key: AliasKey): string | undefined {
  for (const a of ALIASES[key]) {
    const v = m.get(a);
    if (v) return v;
  }
  return undefined;
}

function linkOf(it: LV): ParsedLink | null {
  const href = typeof it.href === 'string' ? it.href : '';
  if (href) return parseLink(href);
  if (is('url', it.label)) return parseLink(str(it.value));
  return null;
}

const isMediaLink = (p: ParsedLink | null): p is ParsedLink => !!p && p.kind !== 'other';

function parseMedia(lv: LV[], timestamp?: unknown): ExportItem | null {
  let link: ParsedLink | null = null;
  const captions: string[] = [];
  const titles: string[] = [];
  const hashtags: string[] = [];
  let author: string | undefined;
  let authorName: string | undefined;

  for (const it of lv) {
    if (isGroup(it)) {
      if (is('hashtags', it.title)) {
        for (const h of it.dict) {
          const f = fields(isGroup(h) ? h.dict : [h]);
          const n = pick(f, 'name') ?? [...f.values()][0];
          if (n) hashtags.push(n.replace(/^#/, '').toLowerCase());
        }
      } else if (is('owner', it.title)) {
        const first = it.dict[0];
        const f = fields(first && isGroup(first) ? first.dict : it.dict);
        author = pick(f, 'username');
        authorName = pick(f, 'name');
      }
      continue;
    }
    if (!link) {
      const l = linkOf(it);
      if (l) {
        link = l;
        continue;
      }
    }
    const value = str(it.value);
    if (!value) continue;
    if (is('caption', it.label)) captions.push(value);
    else if (is('title', it.label)) titles.push(value);
  }

  if (!link) return null;
  return {
    id: link.id,
    url: link.url,
    kind: link.kind,
    savedAt: tsToMs(timestamp),
    caption: uniq(captions).join('\n\n') || undefined,
    title: uniq(titles)[0],
    hashtags: uniq(hashtags),
    author: author || undefined,
    authorName: authorName || undefined,
  };
}

function entryKind(e: RawEntry): 'post' | 'collection' | null {
  const lv = e.label_values;
  if (!Array.isArray(lv)) return null;
  if (lv.some((it) => !isGroup(it) && linkOf(it))) return 'post';
  const hasMediaChildren = lv.some(
    (g) => isGroup(g) && g.dict.some((c) => isGroup(c) && c.dict.some((x) => !isGroup(x) && isMediaLink(linkOf(x)))),
  );
  return hasMediaChildren ? 'collection' : null;
}

function parseCollection(e: RawEntry): { col: ExportCollection; items: ExportItem[] } | null {
  const lv = e.label_values ?? [];
  const items: ExportItem[] = [];
  for (const g of lv) {
    if (!isGroup(g)) continue;
    for (const child of g.dict) {
      if (!isGroup(child)) continue;
      const item = parseMedia(child.dict);
      if (item && item.kind !== 'other') items.push(item);
    }
  }
  if (!items.length) return null;
  const name = pick(fields(lv), 'name') || 'Bez názvu';
  const upd = lv.find((it) => typeof it.timestamp_value === 'number')?.timestamp_value;
  return {
    col: { name, createdAt: tsToMs(e.timestamp), updatedAt: tsToMs(upd), ids: uniq(items.map((i) => i.id)) },
    items,
  };
}

/** Náhradný režim pre neznámy formát: pozbiera všetky odkazy na IG príspevky (+ najbližší timestamp). */
function harvest(json: unknown, out: ExportItem[]): number {
  const seen = new Set<string>();
  let n = 0;
  const walk = (node: unknown, ts: unknown) => {
    if (Array.isArray(node)) {
      for (const x of node) walk(x, ts);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    const t = typeof o.timestamp === 'number' ? o.timestamp : ts;
    for (const v of Object.values(o)) {
      if (typeof v === 'string') {
        if (!/instagr(\.am|am\.com)/i.test(v)) continue;
        const p = parseLink(v);
        if (isMediaLink(p) && !seen.has(p.id)) {
          seen.add(p.id);
          out.push({ id: p.id, url: p.url, kind: p.kind, savedAt: tsToMs(t), hashtags: [] });
          n++;
        }
      } else if (v && typeof v === 'object') walk(v, t);
    }
  };
  walk(json, undefined);
  return n;
}

export function parseExportFiles(files: { name: string; json: unknown }[]): ParsedExport {
  const out: ParsedExport = { posts: [], collections: [], extraItems: [], files: [], warnings: [] };
  for (const f of files) {
    let posts = 0;
    let cols = 0;
    if (Array.isArray(f.json)) {
      for (const e of f.json as RawEntry[]) {
        if (!e || typeof e !== 'object') continue;
        const k = entryKind(e);
        if (k === 'post') {
          const it = parseMedia(e.label_values!, e.timestamp);
          if (it) {
            out.posts.push(it);
            posts++;
          }
        } else if (k === 'collection') {
          const c = parseCollection(e);
          if (c) {
            out.collections.push(c.col);
            out.extraItems.push(...c.items);
            cols++;
          }
        }
      }
    }
    if (posts || cols) {
      out.files.push({ name: f.name, kind: posts && cols ? 'mixed' : posts ? 'posts' : 'collections', posts, collections: cols });
      continue;
    }
    // súbor bez príspevkov (napr. saved_music.json) sa len uvedie v zozname súborov ako preskočený
    const n = harvest(f.json, out.extraItems);
    out.files.push({ name: f.name, kind: n ? 'fallback' : 'empty', posts: n, collections: 0 });
    if (n) out.warnings.push(`${f.name}: neznámy formát – načítané len odkazy (${n}).`);
  }
  return out;
}
