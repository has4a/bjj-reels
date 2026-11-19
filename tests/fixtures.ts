/** Syntetické dáta v rovnakej štruktúre (a rovnakom pokazenom kódovaní) ako reálny Instagram export. */

/** zakóduje text tak, ako to robí Instagram export: UTF-8 bajty ako znaky \u00XX */
export const moj = (s: string) => String.fromCharCode(...new TextEncoder().encode(s));

export interface PostOpts {
  code: string;
  kind?: 'reel' | 'p' | 'tv';
  ts?: number;
  caption?: string;
  hashtags?: string[];
  user?: string;
  name?: string;
  captionTwice?: boolean;
}

export function postEntry(o: PostOpts) {
  const url = `https://www.instagram.com/${o.kind ?? 'reel'}/${o.code}/`;
  const cap = [{ label: 'Titulok', value: moj(o.caption ?? '') }, { label: moj('Názov'), value: '' }];
  return {
    timestamp: o.ts ?? 1_700_000_000,
    media: [],
    label_values: [
      { label: 'URL', value: url, href: url },
      ...cap,
      ...(o.captionTwice ? cap : []),
      {
        dict: (o.hashtags ?? []).map((h) => ({ dict: [{ label: 'Meno', value: moj(h) }], title: '' })),
        title: 'Hashtagy',
      },
      {
        dict: [
          {
            dict: [
              { label: 'URL', value: 'https://linktr.ee/someone' },
              { label: 'Meno', value: moj(o.name ?? 'Display Name') },
              { label: moj('Používateľské meno'), value: o.user ?? 'someone' },
            ],
            title: '',
          },
        ],
        title: moj('Vlastník'),
      },
      { dict: [], title: moj('Značkový partner') },
    ],
  };
}

export function collectionEntry(name: string, posts: ReturnType<typeof postEntry>[], ts = 1_700_000_000) {
  return {
    timestamp: ts,
    media: [],
    label_values: [
      { label: 'Meno', value: moj(name) },
      { label: 'Typ', value: moj('Predvolené') },
      { label: moj('Súkromie'), value: moj('Súkromné') },
      { label: moj('Čas aktualizácie'), timestamp_value: ts + 100 },
      { dict: posts.map((p) => ({ dict: p.label_values, title: '' })), title: moj('Médiá') },
    ],
  };
}

export const musicEntry = {
  timestamp: 1_690_298_140,
  media: [],
  label_values: [
    { label: moj('Názov'), value: 'Goodness Gracious' },
    { label: 'Interpret', value: 'Someone' },
    { label: moj('Čas začiatku'), timestamp_value: 0 },
  ],
};
