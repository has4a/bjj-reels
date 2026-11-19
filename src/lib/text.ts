const utf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Instagram/Facebook export ukladá UTF-8 bajty ako jednotlivé znaky \u00XX
 * ("NÃ¡zov" namiesto "Názov", rozbité emoji). Ak reťazec vyzerá takto, dekóduj ho späť.
 * Reťazce, ktoré už sú správny Unicode (alebo nie sú platné UTF-8 bajty), ostanú nezmenené.
 */
export function fixMojibake(s: string): string {
  let needs = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return s;
    if (c > 127) needs = true;
  }
  if (!needs) return s;
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  try {
    return utf8.decode(bytes);
  } catch {
    return s;
  }
}

/** malé písmená bez diakritiky – na fulltext */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function uniq<T>(arr: Iterable<T>): T[] {
  return [...new Set(arr)];
}

export function normTag(s: string): string {
  return s.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();
}

export function formatDate(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** slovenské skloňovanie: plural(5, 'reel', 'reely', 'reelov') */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function countBy(values: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}
