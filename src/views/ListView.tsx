import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BulkSheet } from '../components/BulkSheet';
import { FilterSheet } from '../components/FilterSheet';
import { ReelCard } from '../components/ReelCard';
import {
  EMPTY_FILTERS,
  SORT_LABEL,
  activeFilterCount,
  applyFilters,
  computeFacets,
  isUnsorted,
  sortReels,
  type Filters,
  type SortKey,
} from '../lib/filters';
import { plural } from '../lib/text';
import { navigate, reelPath } from '../state/router';
import { useStore } from '../state/store';
import { usePersistentState } from '../state/usePersistentState';
import { GI_LABEL, LEVEL_LABEL, STATUSES, STATUS_LABEL } from '../types';
import { Belt, BrandMark, Chip } from '../ui/controls';
import { IconFilter, IconLayers, IconSearch, IconStarFilled, IconX } from '../ui/icons';
import { ImportPanel } from './SettingsView';

const PAGE = 48;
type ArrKey = 'positions' | 'types' | 'gi' | 'levels' | 'statuses' | 'tags' | 'igCollections';

export function ListView() {
  const { reels, update } = useStore();
  const [filters, setFilters] = usePersistentState<Filters>('bjj.filters', EMPTY_FILTERS);
  const [sort, setSort] = usePersistentState<SortKey>('bjj.sort', 'saved-desc');
  const [sheet, setSheet] = useState<'filters' | 'bulk' | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const results = useMemo(() => sortReels(applyFilters(reels, filters), sort), [reels, filters, sort]);
  const facets = useMemo(() => computeFacets(reels, filters), [reels, filters]);
  // súhrn celej knižnice (nezávisle od filtrov)
  const totals = useMemo(() => {
    let bjj = 0;
    let unsorted = 0;
    for (const r of reels) {
      if (r.hidden) continue;
      bjj++;
      if (isUnsorted(r)) unsorted++;
    }
    return { bjj, unsorted };
  }, [reels]);
  const active = activeFilterCount(filters);
  const more = results.length > limit;

  useEffect(() => setLimit(PAGE), [filters, sort]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setLimit((l) => l + PAGE), { rootMargin: '1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more]);

  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const toggle = (key: ArrKey, v: string) =>
    setFilters((f) => {
      const cur = f[key] as string[];
      return { ...f, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const onEdit = useCallback((id: string) => navigate(reelPath(id)), []);
  const onAuthor = useCallback(
    (author: string) => {
      setFilters((f) => ({ ...f, author }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setFilters],
  );
  const onFavorite = useCallback((id: string) => update(id, (r) => ({ favorite: !r.favorite })), [update]);

  if (!reels.length) return <EmptyLibrary />;

  const removable: { key: string; label: string; clear: () => void; tone?: string }[] = [
    ...(filters.visibility !== 'bjj'
      ? [{ key: 'vis', label: filters.visibility === 'hidden' ? 'Mimo BJJ' : 'Všetko vrátane mimo BJJ', clear: () => set({ visibility: 'bjj' }) }]
      : []),
    ...(filters.author ? [{ key: 'author', label: `@${filters.author}`, clear: () => set({ author: null }) }] : []),
    ...filters.positions.map((v) => ({ key: 'p' + v, label: v, tone: 'pos', clear: () => toggle('positions', v) })),
    ...filters.types.map((v) => ({ key: 't' + v, label: v, tone: 'type', clear: () => toggle('types', v) })),
    ...filters.gi.map((v) => ({ key: 'g' + v, label: GI_LABEL[v], clear: () => toggle('gi', v) })),
    ...filters.levels.map((v) => ({ key: 'l' + v, label: LEVEL_LABEL[v], clear: () => toggle('levels', v) })),
    ...filters.tags.map((v) => ({ key: '#' + v, label: '#' + v, tone: 'tag', clear: () => toggle('tags', v) })),
    ...filters.igCollections.map((v) => ({ key: 'c' + v, label: v, tone: 'col', clear: () => toggle('igCollections', v) })),
  ];

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <span className="display brand-name">BJJ Reels</span>
          <span className="brand-count faint num">
            {totals.bjj} BJJ · {totals.unsorted} {plural(totals.unsorted, 'netriedený', 'netriedené', 'netriedených')}
          </span>
        </div>
        <div className="search-row">
          <label className="search">
            <IconSearch size={18} />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Hľadaj: armbar, kimura, autor…"
              aria-label="Hľadať v poznámkach, tagoch a popisoch"
              enterKeyHint="search"
            />
            {filters.q && (
              <button type="button" className="clear" onClick={() => set({ q: '' })} aria-label="Vymazať hľadanie">
                <IconX size={16} />
              </button>
            )}
          </label>
          <button type="button" className="icon-btn" onClick={() => setSheet('filters')} aria-label={`Filtre${active ? ` (${active} aktívnych)` : ''}`}>
            <IconFilter size={19} />
            {active > 0 && <span className="badge">{active}</span>}
          </button>
        </div>
        <div className="quickbar" role="group" aria-label="Rýchle filtre">
          <Chip on={filters.unsorted} count={facets.unsorted} onClick={() => set({ unsorted: !filters.unsorted })}>
            Netriedené
          </Chip>
          <Chip on={filters.favorite} count={facets.favorite} onClick={() => set({ favorite: !filters.favorite })}>
            <IconStarFilled size={14} className="gold" /> Obľúbené
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} on={filters.statuses.includes(s)} count={facets.statuses.get(s) ?? 0} onClick={() => toggle('statuses', s)}>
              <Belt status={s} />
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </header>

      {removable.length > 0 && (
        <div className="active-filters">
          {removable.map((r) => (
            <button key={r.key} type="button" className={`chip on small ${r.tone ?? ''}`} onClick={r.clear} aria-label={`Zrušiť filter ${r.label}`}>
              {r.label} <IconX size={13} />
            </button>
          ))}
          <button type="button" className="link-btn" onClick={() => setFilters({ ...EMPTY_FILTERS })}>
            Zrušiť všetko
          </button>
        </div>
      )}

      <div className="results-head">
        <span className="num">
          <b>{results.length}</b> {plural(results.length, 'reel', 'reely', 'reelov')}
        </span>
        <select className="select sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Zoradiť">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
        <button type="button" className="btn sm" onClick={() => setSheet('bulk')} disabled={!results.length}>
          <IconLayers size={16} /> Hromadne
        </button>
      </div>

      {results.length ? (
        <div className="grid">
          {results.slice(0, limit).map((r) => (
            <ReelCard key={r.id} reel={r} onEdit={onEdit} onAuthor={onAuthor} onFavorite={onFavorite} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>
            {filters.q ? `Nič pre „${filters.q}“` : 'Týmto filtrom nič nezodpovedá.'}
            {filters.visibility === 'bjj' && facets.visibility.hidden > 0 && filters.q && ' v BJJ knižnici.'}
          </p>
          <div className="row center">
            <button type="button" className="btn" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}>
              Zrušiť filtre
            </button>
            {filters.q && filters.visibility === 'bjj' && (
              <button type="button" className="btn ghost" onClick={() => set({ visibility: 'all' })}>
                Hľadať aj mimo BJJ
              </button>
            )}
          </div>
        </div>
      )}
      {more && (
        <div ref={sentinel} className="sentinel faint">
          Načítavam ďalšie…
        </div>
      )}

      {sheet === 'filters' && (
        <FilterSheet filters={filters} setFilters={setFilters} facets={facets} resultCount={results.length} onClose={() => setSheet(null)} />
      )}
      {sheet === 'bulk' && <BulkSheet ids={results.map((r) => r.id)} onClose={() => setSheet(null)} />}
    </>
  );
}

function EmptyLibrary() {
  return (
    <div className="empty-lib">
      <div className="hero">
        <BrandMark />
        <h1 className="display">Tvoja BJJ knižnica</h1>
        <p className="muted">
          Nahraj export uložených príspevkov z Instagramu. Appka z nich vyberie BJJ reels a pomôže ti ich roztriediť podľa pozície, typu a toho,
          čo práve driluješ.
        </p>
      </div>
      <ImportPanel />
      <p className="faint center">
        Alebo pridaj jeden reel cez{' '}
        <a href="#/add" onClick={(e) => (e.preventDefault(), navigate('add', true))}>
          Pridať
        </a>
        .
      </p>
    </div>
  );
}
