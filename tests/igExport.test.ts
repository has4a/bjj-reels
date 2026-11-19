import { describe, expect, it } from 'vitest';
import { parseExportFiles } from '../src/lib/igExport';
import { fixMojibake } from '../src/lib/text';
import { collectionEntry, moj, musicEntry, postEntry } from './fixtures';

describe('fixMojibake', () => {
  it('opraví slovenčinu a emoji z exportu', () => {
    expect(fixMojibake('NÃ¡zov')).toBe('Názov');
    expect(fixMojibake('Ä\u008cas zaÄ\u008diatku')).toBe('Čas začiatku');
    expect(fixMojibake('Commitment ð\u009f\u0099\u008f')).toBe('Commitment 🙏');
  });
  it('správny text nechá tak', () => {
    expect(fixMojibake('Názov 🙏')).toBe('Názov 🙏');
    expect(fixMojibake('café')).toBe('café'); // é ako jeden znak nie je platné UTF-8
    expect(fixMojibake('plain ascii')).toBe('plain ascii');
  });
});

describe('parseExportFiles', () => {
  const a = postEntry({ code: 'AAA', ts: 1_794_911_436, caption: 'Armbar z guardu 🙏', hashtags: ['bjj', 'JiuJitsu'], user: 'coach', name: 'Coach Ján', captionTwice: true });
  const b = postEntry({ code: 'BBB', kind: 'p', caption: 'Korean popcorn chicken', user: 'chef' });

  it('načíta saved_posts so všetkými poľami', () => {
    const p = parseExportFiles([{ name: 'saved_posts.json', json: [a, b] }]);
    expect(p.files).toEqual([{ name: 'saved_posts.json', kind: 'posts', posts: 2, collections: 0 }]);
    expect(p.posts[0]).toEqual({
      id: 'AAA',
      url: 'https://www.instagram.com/reel/AAA/',
      kind: 'reel',
      savedAt: 1_794_911_436_000,
      caption: 'Armbar z guardu 🙏', // duplicitný Titulok sa nezdvojí
      title: undefined,
      hashtags: ['bjj', 'jiujitsu'],
      author: 'coach',
      authorName: 'Coach Ján',
    });
    expect(p.posts[1]).toMatchObject({ id: 'BBB', kind: 'p', author: 'chef', hashtags: [] });
    expect(p.warnings).toEqual([]);
  });

  it('načíta kolekcie a ich príspevky', () => {
    const p = parseExportFiles([{ name: 'saved_collections.json', json: [collectionEntry('BJJ - armbar ', [a]), collectionEntry(moj('Recepty'), [b])] }]);
    expect(p.collections).toEqual([
      { name: 'BJJ - armbar', createdAt: 1_700_000_000_000, updatedAt: 1_700_000_100_000, ids: ['AAA'] },
      { name: 'Recepty', createdAt: 1_700_000_000_000, updatedAt: 1_700_000_100_000, ids: ['BBB'] },
    ]);
    expect(p.extraItems.map((i) => i.id)).toEqual(['AAA', 'BBB']);
    expect(p.extraItems[0].savedAt).toBeUndefined(); // kolekcie nemajú čas uloženia
  });

  it('saved_music.json preskočí (bez príspevkov)', () => {
    const p = parseExportFiles([{ name: 'saved_music.json', json: [musicEntry] }]);
    expect(p.posts).toEqual([]);
    expect(p.extraItems).toEqual([]);
    expect(p.files).toEqual([{ name: 'saved_music.json', kind: 'empty', posts: 0, collections: 0 }]);
  });

  it('neznámy (starší) formát: aspoň pozbiera odkazy a časy', () => {
    const old = {
      saved_saved_media: [
        { title: 'coach', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/OLD1/', timestamp: 1_600_000_000 } } },
        { title: 'x', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/OLD2/', timestamp: 1_600_000_100 } } },
      ],
    };
    const p = parseExportFiles([{ name: 'saved_posts.json', json: old }]);
    expect(p.files[0].kind).toBe('fallback');
    expect(p.extraItems.map((i) => [i.id, i.savedAt])).toEqual([
      ['OLD1', 1_600_000_000_000],
      ['OLD2', 1_600_000_100_000],
    ]);
  });
});
