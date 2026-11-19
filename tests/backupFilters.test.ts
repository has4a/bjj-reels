import { describe, expect, it } from 'vitest';
import { makeBackup, mergeBackup, mergeLists, parseBackup, sanitizeReel } from '../src/lib/backup';
import { EMPTY_FILTERS, applyFilters, computeFacets, isUnsorted, sortReels, type Filters } from '../src/lib/filters';
import { newReel } from '../src/lib/merge';
import { DEFAULT_SETTINGS, type Reel } from '../src/types';

const r = (id: string, p: Partial<Reel> = {}): Reel => newReel({ id, url: `https://www.instagram.com/reel/${id}/`, kind: 'reel', ...p }, 1);

describe('záloha', () => {
  const reels = [
    r('A', { positions: ['mount'], tags: ['armbar'], notes: 'Pozor na lakeť', favorite: true, updatedAt: 10 }),
    r('B', { hidden: true, caption: 'Recept 🙏', igCollections: ['Recepty'] }),
  ];

  it('export -> JSON -> import vráti rovnaké dáta', () => {
    const json = JSON.parse(JSON.stringify(makeBackup(reels, { ...DEFAULT_SETTINGS, positions: ['mount', 'x'] })));
    const back = parseBackup(json);
    expect(back.reels).toEqual(JSON.parse(JSON.stringify(reels)));
    expect(back.settings.positions).toEqual(['mount', 'x']);
    expect(back.skipped).toBe(0);
  });

  it('odmietne cudzí súbor a opraví chybné polia', () => {
    expect(() => parseBackup([{ timestamp: 1 }])).toThrow(/zálohu|záloha/i);
    expect(sanitizeReel({ id: 'X', url: 'u', status: 'nonsense', gi: 'kimono', positions: ['a', 1, 'a'], favorite: 'yes' }, 3)).toMatchObject({
      status: 'new',
      gi: null,
      positions: ['a'],
      favorite: false,
      kind: 'other',
      addedAt: 3,
    });
    expect(sanitizeReel({ url: 'bez id' })).toBeNull();
  });

  it('zlúčenie: novšia úprava vyhrá, nové sa pridajú', () => {
    const local = new Map(reels.map((x) => [x.id, x]));
    const incoming = [{ ...reels[0], notes: 'staršie', updatedAt: 5 }, { ...reels[1], notes: 'novšie', updatedAt: 50 }, r('C')];
    const m = mergeBackup(local, incoming);
    expect(m).toMatchObject({ added: 1, updated: 1, kept: 1 });
    expect(m.toPut.map((x) => [x.id, x.notes])).toEqual([
      ['B', 'novšie'],
      ['C', ''],
    ]);
    expect(mergeLists(['mount', 'back'], ['Back', 'turtle', 'turtle'])).toEqual(['mount', 'back', 'turtle']);
  });
});

describe('filtre', () => {
  const data = [
    r('1', { positions: ['mount'], types: ['submission'], gi: 'gi', level: 'beginner', status: 'drill', tags: ['armbar'], notes: 'Lakeť dole', savedAt: 3000 }),
    r('2', { positions: ['side control'], gi: 'both', favorite: true, caption: 'Kimura trap', igCollections: ['BJJ - side mount'], savedAt: 2000 }),
    r('3', { gi: 'nogi', author: 'coach', savedAt: 1000 }),
    r('4', { hidden: true, caption: 'Recept', savedAt: 4000 }),
  ];
  const f = (p: Partial<Filters>) => applyFilters(data, { ...EMPTY_FILTERS, ...p }).map((x) => x.id);

  it('predvolene skryje "Mimo BJJ"', () => {
    expect(f({})).toEqual(['1', '2', '3']);
    expect(f({ visibility: 'hidden' })).toEqual(['4']);
    expect(f({ visibility: 'all' })).toHaveLength(4);
  });
  it('netriedené, obľúbené, stav, úroveň', () => {
    expect(data.filter(isUnsorted).map((x) => x.id)).toEqual(['3', '4']);
    expect(f({ unsorted: true })).toEqual(['3']);
    expect(f({ favorite: true })).toEqual(['2']);
    expect(f({ statuses: ['drill'] })).toEqual(['1']);
    expect(f({ levels: ['beginner', 'advanced'] })).toEqual(['1']);
  });
  it('gi filter zahŕňa "obe"', () => {
    expect(f({ gi: ['gi'] })).toEqual(['1', '2']);
    expect(f({ gi: ['nogi'] })).toEqual(['2', '3']);
    expect(f({ gi: ['both'] })).toEqual(['2']);
  });
  it('fulltext bez diakritiky cez poznámky, tagy, popis, kolekcie', () => {
    expect(f({ q: 'laket' })).toEqual(['1']);
    expect(f({ q: 'ARMBAR' })).toEqual(['1']);
    expect(f({ q: 'kimura side' })).toEqual(['2']);
    expect(f({ q: 'side mount' })).toEqual(['2']);
  });
  it('v rámci poľa OR, medzi poľami AND', () => {
    expect(f({ positions: ['mount', 'side control'] })).toEqual(['1', '2']);
    expect(f({ positions: ['mount', 'side control'], types: ['submission'] })).toEqual(['1']);
  });
  it('počítadlá ignorujú vlastný filter', () => {
    const fc = computeFacets(data, { ...EMPTY_FILTERS, positions: ['mount'] });
    expect(fc.positions.get('mount')).toBe(1);
    expect(fc.positions.get('side control')).toBe(1);
    expect(fc.types.get('submission')).toBe(1);
    expect(fc.unsorted).toBe(0);
    expect(fc.visibility).toEqual({ bjj: 1, hidden: 0, all: 1 });
  });
  it('triedenie podľa dátumu uloženia', () => {
    expect(sortReels(data, 'saved-desc').map((x) => x.id)).toEqual(['4', '1', '2', '3']);
    expect(sortReels(data, 'saved-asc').map((x) => x.id)).toEqual(['3', '2', '1', '4']);
  });
});
