import { describe, expect, it } from 'vitest';
import { parseExportFiles } from '../src/lib/igExport';
import { buildCandidates, defaultBjjSelection, isBjj, looksLikeBjj, newReel, planImport, type BjjRule } from '../src/lib/merge';
import type { Reel } from '../src/types';
import { collectionEntry, postEntry } from './fixtures';

const armbar = postEntry({ code: 'ARM', ts: 1_700_000_300, caption: 'Armbar setup', hashtags: ['bjj'], user: 'coach' });
const chicken = postEntry({ code: 'CHK', ts: 1_700_000_200, caption: 'Korean popcorn chicken', user: 'chef' });
const loose = postEntry({ code: 'LOS', ts: 1_700_000_100, caption: 'Sneaky entry to rear triangle', hashtags: ['nogi'], user: 'x' });
const random = postEntry({ code: 'RND', ts: 1_700_000_000, caption: 'Router table box joints', hashtags: ['woodworking'], user: 'wood' });

const parsed = parseExportFiles([
  { name: 'saved_posts.json', json: [armbar, chicken, loose, random] },
  { name: 'saved_collections.json', json: [collectionEntry('BJJ - armbar', [armbar]), collectionEntry('Jiu jitsu', [armbar]), collectionEntry('Recepty', [chicken])] },
]);
const cands = buildCandidates(parsed);
const rule: BjjRule = { mode: 'smart', collections: ['BJJ - armbar', 'Jiu jitsu'] };

describe('buildCandidates', () => {
  it('spojí príspevky s kolekciami', () => {
    expect(cands.size).toBe(4);
    expect(cands.get('ARM')!.igCollections).toEqual(['BJJ - armbar', 'Jiu jitsu']);
    expect(cands.get('ARM')!.savedAt).toBe(1_700_000_300_000);
    expect(cands.get('CHK')!.igCollections).toEqual(['Recepty']);
    expect(cands.get('LOS')!.igCollections).toEqual([]);
  });
});

describe('BJJ pravidlo', () => {
  it('kolekcia rozhoduje, bez kolekcie hashtagy/popis', () => {
    expect(isBjj(cands.get('ARM')!, rule)).toBe(true);
    expect(isBjj(cands.get('CHK')!, rule)).toBe(false);
    expect(isBjj(cands.get('LOS')!, rule)).toBe(true);
    expect(isBjj(cands.get('RND')!, rule)).toBe(false);
    expect(isBjj(cands.get('RND')!, { mode: 'all', collections: [] })).toBe(true);
  });
  it('kľúčové slová bez falošných zhôd', () => {
    expect(looksLikeBjj({ caption: 'Kimura trap from side control', hashtags: [] })).toBe(true);
    expect(looksLikeBjj({ caption: 'x', hashtags: ['jiujitsulifestyle'] })).toBe(true);
    expect(looksLikeBjj({ caption: 'Tacoma phone mount 3D print', hashtags: ['technologie'] })).toBe(false);
    expect(looksLikeBjj({ caption: 'Artichoke pasta with chicken', hashtags: ['comma'] })).toBe(false);
  });
  it('predvoľba kolekcií', () => {
    const names = ['BJJ - armbar', 'Recepty', 'Judo', 'Jiu jitsu', 'Nová BJJ kolekcia'];
    expect(defaultBjjSelection(names, null, [])).toEqual(['BJJ - armbar', 'Judo', 'Jiu jitsu', 'Nová BJJ kolekcia']);
    // používateľ predtým odškrtol Judo -> zostane odškrtnuté; nová kolekcia sa predvyberie podľa názvu
    expect(defaultBjjSelection(names, ['BJJ - armbar', 'Jiu jitsu'], ['BJJ - armbar', 'Recepty', 'Judo', 'Jiu jitsu'])).toEqual([
      'BJJ - armbar',
      'Jiu jitsu',
      'Nová BJJ kolekcia',
    ]);
  });
});

describe('planImport', () => {
  it('prvý import pridá všetko a ne-BJJ skryje', () => {
    const plan = planImport(new Map(), cands, rule, 5);
    expect(plan).toMatchObject({ added: 4, addedBjj: 2, existing: 0, enriched: 0 });
    const byId = new Map(plan.toPut.map((r) => [r.id, r]));
    expect(byId.get('ARM')).toMatchObject({ hidden: false, source: 'export', status: 'new', author: 'coach', addedAt: 5 });
    expect(byId.get('CHK')!.hidden).toBe(true);
    expect(byId.get('RND')!.hidden).toBe(true);
  });

  it('opakovaný import nič neprepíše a nepridá duplicity', () => {
    const first = planImport(new Map(), cands, rule, 5);
    const db = new Map<string, Reel>(first.toPut.map((r) => [r.id, r]));
    // používateľ si reel otriedil
    db.set('ARM', { ...db.get('ARM')!, positions: ['mount'], types: ['submission'], tags: ['armbar'], notes: 'moje', status: 'drill', favorite: true, updatedAt: 99 });
    const again = planImport(db, cands, { mode: 'all', collections: [] }, 6);
    expect(again).toMatchObject({ added: 0, existing: 4, enriched: 0, toPut: [] });
  });

  it('pri existujúcom ručne pridanom reele doplní len prázdne údaje a nové kolekcie', () => {
    const manual = newReel({ id: 'ARM', url: 'https://www.instagram.com/reel/ARM/', kind: 'reel', tags: ['moj-tag'], status: 'learned', hidden: false }, 1);
    const plan = planImport(new Map([['ARM', manual]]), cands, rule, 7);
    expect(plan).toMatchObject({ added: 3, existing: 1, enriched: 1 });
    const arm = plan.toPut.find((r) => r.id === 'ARM')!;
    expect(arm).toMatchObject({
      author: 'coach',
      caption: 'Armbar setup',
      savedAt: 1_700_000_300_000,
      igCollections: ['BJJ - armbar', 'Jiu jitsu'],
      tags: ['moj-tag'],
      status: 'learned',
      source: 'manual',
      updatedAt: 1,
    });
  });
});
