import type { ReelKind } from '../types';

export interface ParsedLink {
  /** kľúč na duplicity */
  id: string;
  /** kanonická URL (bez ?igsh=… a podobných parametrov) */
  url: string;
  kind: ReelKind;
  code?: string;
}

const HOST = String.raw`https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/`;
// instagram.com/share/reel/<kód> – zdieľací odkaz z appky; kód NIE JE shortcode príspevku
const SHARE_RE = new RegExp(`^${HOST}share\\/(?:(reels?|p|tv)\\/)?([A-Za-z0-9_-]+)`, 'i');
// instagram.com/[username/]reel|reels|p|tv/<shortcode>
const MEDIA_RE = new RegExp(`^${HOST}(?:[A-Za-z0-9._]+\\/)?(reels?|p|tv)\\/([A-Za-z0-9_-]+)`, 'i');
const TRACKING_PARAM = /^(utm_.*|igsh|igshid|fbclid|si)$/i;

/**
 * Normalizuje odkaz. Rovnaký príspevok s rôznymi parametrami (?igsh=…) alebo
 * cez /p/ vs /reel/ dostane rovnaké id = Instagram shortcode.
 */
export function parseLink(input: string): ParsedLink | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    if (/^(www\.|m\.)?(instagram\.com|instagr\.am)\//i.test(s)) s = 'https://' + s;
    else return null;
  }

  let m = SHARE_RE.exec(s);
  if (m) {
    const k = m[1] ? m[1].toLowerCase().replace('reels', 'reel') + '/' : '';
    return { id: `share:${m[2]}`, url: `https://www.instagram.com/share/${k}${m[2]}/`, kind: 'share', code: m[2] };
  }

  m = MEDIA_RE.exec(s);
  if (m) {
    const raw = m[1].toLowerCase();
    const kind = (raw === 'reels' ? 'reel' : raw) as 'reel' | 'p' | 'tv';
    return { id: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/`, kind, code: m[2] };
  }

  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const key of [...u.searchParams.keys()]) if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
    const norm = u.toString();
    return { id: `url:${norm}`, url: norm, kind: 'other' };
  } catch {
    return null;
  }
}

/** Nájde v texte (napr. zo zdieľania) prvý odkaz; uprednostní Instagram. */
export function extractLink(text: string): ParsedLink | null {
  const found = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const parsed = found
    .map((u) => parseLink(u.replace(/[),.;!?]+$/, '')))
    .filter((p): p is ParsedLink => p !== null);
  return parsed.find((p) => p.kind !== 'other') ?? parsed[0] ?? parseLink(text);
}

/** URL oficiálneho Instagram embedu (len pre reel/p/tv) */
export function embedUrl(kind: ReelKind, code?: string): string | null {
  if (!code || (kind !== 'reel' && kind !== 'p' && kind !== 'tv')) return null;
  return `https://www.instagram.com/${kind}/${code}/embed/`;
}

export function codeOf(id: string, kind: ReelKind): string | undefined {
  return kind === 'reel' || kind === 'p' || kind === 'tv' ? id : undefined;
}
