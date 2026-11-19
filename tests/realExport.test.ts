/**
 * Test na tvojom reálnom exporte. Spúšťa sa len ak je nastavená premenná IG_EXPORT_DIR
 * (priečinok so saved_posts.json a saved_collections.json). Export sa nikam nekopíruje.
 *   IG_EXPORT_DIR="C:/Users/<ty>/Downloads/saved" npm test
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseExportFiles } from '../src/lib/igExport';
import { buildCandidates, defaultBjjSelection, planImport } from '../src/lib/merge';
import type { Reel } from '../src/types';

const dir = process.env.IG_EXPORT_DIR;
const files = ['saved_posts.json', 'saved_collections.json', 'saved_music.json'];

describe.skipIf(!dir)('reálny Instagram export', () => {
  const load = () =>
    files
      .filter((n) => existsSync(join(dir!, n)))
      .map((name) => ({ name, json: JSON.parse(readFileSync(join(dir!, name), 'utf8')) as unknown }));

  it('načíta celý export, opraví kódovanie a pri druhom importe nič nepridá', () => {
    const parsed = parseExportFiles(load());
    const cands = buildCandidates(parsed);
    const names = parsed.collections.map((c) => c.name);
    const bjj = defaultBjjSelection(names, null, []);
    const plan = planImport(new Map(), cands, { mode: 'smart', collections: bjj }, 1);

    const withCols = [...cands.values()].filter((c) => c.igCollections.length).length;
    const reels = plan.toPut;
    // typický zvyšok zlého kódovania: Ã/Ä/Å + znak z rozsahu \u0080–¿ (legitímne "JOÃO" neprekáža)
    const mojibake = reels.filter((r) =>
      /[ÃÄÅÂ][\u0080-¿]|ð\u009f/.test(`${r.caption ?? ''}${r.authorName ?? ''}${r.igCollections.join('')}`),
    );

    console.log(
      JSON.stringify(
        {
          files: parsed.files,
          warnings: parsed.warnings,
          posts: parsed.posts.length,
          uniqueReels: cands.size,
          collections: names.length,
          bjjCollections: bjj.length,
          inSomeCollection: withCols,
          added: plan.added,
          visibleAsBjj: plan.addedBjj,
          hiddenAsOther: plan.added - plan.addedBjj,
          withoutAuthor: reels.filter((r) => !r.author).length,
          withoutSavedAt: reels.filter((r) => !r.savedAt).length,
          remainingMojibake: mojibake.length,
        },
        null,
        2,
      ),
    );

    expect(parsed.posts.length).toBeGreaterThan(0);
    expect(cands.size).toBe(new Set(parsed.posts.map((p) => p.id)).size); // všetko z kolekcií je aj v saved_posts
    expect(mojibake).toEqual([]);
    expect(reels.every((r) => r.url.startsWith('https://www.instagram.com/'))).toBe(true);

    const db = new Map<string, Reel>(reels.map((r) => [r.id, r]));
    const again = planImport(db, buildCandidates(parseExportFiles(load())), { mode: 'all', collections: [] }, 2);
    expect(again.added).toBe(0);
    expect(again.toPut).toEqual([]);
  });
});
