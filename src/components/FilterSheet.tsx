import { useState, type Dispatch, type SetStateAction } from 'react';
import { EMPTY_FILTERS, type Facets, type Filters, type Visibility } from '../lib/filters';
import { uniq } from '../lib/text';
import { useStore } from '../state/store';
import { GIS, GI_LABEL, LEVELS, LEVEL_LABEL, STATUSES, STATUS_LABEL } from '../types';
import { Belt, Chip, Group, Segmented, Sheet } from '../ui/controls';
import { IconStarFilled } from '../ui/icons';

type ArrKey = 'positions' | 'types' | 'gi' | 'levels' | 'statuses' | 'tags' | 'igCollections';
const VIS: Visibility[] = ['bjj', 'hidden', 'all'];
const TAG_LIMIT = 30;

const byCount = (m: Map<string, number>, selected: string[]) =>
  uniq([...[...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k), ...selected]);

export function FilterSheet({
  filters,
  setFilters,
  facets,
  resultCount,
  onClose,
}: {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  facets: Facets;
  resultCount: number;
  onClose: () => void;
}) {
  const { settings } = useStore();
  const [allTags, setAllTags] = useState(false);
  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const toggle = (key: ArrKey, v: string) =>
    setFilters((f) => {
      const cur = f[key] as string[];
      return { ...f, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  const has = (key: ArrKey, v: string) => (filters[key] as string[]).includes(v);

  const positions = uniq([...settings.positions, ...[...facets.positions.keys()].sort(), ...filters.positions]);
  const types = uniq([...settings.types, ...[...facets.types.keys()].sort(), ...filters.types]);
  const tags = byCount(facets.tags, filters.tags);
  const cols = byCount(facets.igCollections, filters.igCollections);

  return (
    <Sheet
      title="Filtre"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}>
            Zrušiť filtre
          </button>
          <button type="button" className="btn primary grow" onClick={onClose}>
            Zobraziť {resultCount}
          </button>
        </>
      }
    >
      <Group label="Knižnica">
        <Segmented
          label="Knižnica"
          options={VIS}
          labels={{
            bjj: `BJJ ${facets.visibility.bjj}`,
            hidden: `Mimo BJJ ${facets.visibility.hidden}`,
            all: `Všetko ${facets.visibility.all}`,
          }}
          value={filters.visibility}
          onChange={(v) => set({ visibility: v ?? 'bjj' })}
        />
      </Group>

      <Group label="Rýchle">
        <div className="chips">
          <Chip on={filters.unsorted} count={facets.unsorted} onClick={() => set({ unsorted: !filters.unsorted })}>
            Netriedené
          </Chip>
          <Chip on={filters.favorite} count={facets.favorite} onClick={() => set({ favorite: !filters.favorite })}>
            <IconStarFilled size={14} className="gold" /> Obľúbené
          </Chip>
        </div>
      </Group>

      <Group label="Stav">
        <div className="chips">
          {STATUSES.map((s) => (
            <Chip key={s} on={has('statuses', s)} count={facets.statuses.get(s) ?? 0} onClick={() => toggle('statuses', s)}>
              <Belt status={s} />
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group label="Pozícia">
        <div className="chips">
          {positions.map((p) => (
            <Chip key={p} tone="pos" on={has('positions', p)} count={facets.positions.get(p) ?? 0} onClick={() => toggle('positions', p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Group>

      <Group label="Typ">
        <div className="chips">
          {types.map((t) => (
            <Chip key={t} tone="type" on={has('types', t)} count={facets.types.get(t) ?? 0} onClick={() => toggle('types', t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>

      <div className="pair">
        <Group label="Gi / No-gi" hint="„Obe“ sa ráta do oboch">
          <div className="chips">
            {GIS.map((g) => (
              <Chip key={g} on={has('gi', g)} count={facets.gi.get(g) ?? 0} onClick={() => toggle('gi', g)}>
                {GI_LABEL[g]}
              </Chip>
            ))}
          </div>
        </Group>
        <Group label="Úroveň">
          <div className="chips">
            {LEVELS.map((l) => (
              <Chip key={l} on={has('levels', l)} count={facets.levels.get(l) ?? 0} onClick={() => toggle('levels', l)}>
                {LEVEL_LABEL[l]}
              </Chip>
            ))}
          </div>
        </Group>
      </div>

      {tags.length > 0 && (
        <Group label="Tagy">
          <div className="chips">
            {(allTags ? tags : tags.slice(0, TAG_LIMIT)).map((t) => (
              <Chip key={t} tone="tag" on={has('tags', t)} count={facets.tags.get(t) ?? 0} onClick={() => toggle('tags', t)}>
                #{t}
              </Chip>
            ))}
            {tags.length > TAG_LIMIT && (
              <button type="button" className="link-btn" onClick={() => setAllTags((v) => !v)}>
                {allTags ? 'Menej' : `Všetky (${tags.length})`}
              </button>
            )}
          </div>
        </Group>
      )}

      {cols.length > 0 && (
        <Group label="Kolekcie z Instagramu">
          <div className="chips">
            {cols.map((c) => (
              <Chip key={c} tone="col" on={has('igCollections', c)} count={facets.igCollections.get(c) ?? 0} onClick={() => toggle('igCollections', c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      {filters.author && (
        <Group label="Autor">
          <div className="chips">
            <Chip on onClick={() => set({ author: null })} title="Zrušiť filter autora">
              @{filters.author} ✕
            </Chip>
          </div>
        </Group>
      )}
    </Sheet>
  );
}
