import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { normTag, uniq } from '../lib/text';
import { useStore, useTagSuggestions } from '../state/store';
import { GIS, GI_LABEL, LEVELS, LEVEL_LABEL, STATUSES, STATUS_LABEL, type Reel } from '../types';
import { Belt, Chip, Group, Segmented } from '../ui/controls';

/** Všetky polia triedenia jedného reelu. Každá zmena sa ukladá hneď. */
export function Classifier({ reel, size = 'md' }: { reel: Reel; size?: 'md' | 'lg' }) {
  const { settings, update } = useStore();
  const suggestions = useTagSuggestions();
  const toggle = (field: 'positions' | 'types', v: string) =>
    update(reel.id, (r) => ({ [field]: r[field].includes(v) ? r[field].filter((x) => x !== v) : [...r[field], v] }));

  return (
    <div className={`classifier ${size}`}>
      <Group label="Pozícia" hint={reel.positions.length ? undefined : 'môžeš vybrať viac'}>
        <div className="chips">
          {uniq([...settings.positions, ...reel.positions]).map((p) => (
            <Chip key={p} tone="pos" size={size} on={reel.positions.includes(p)} onClick={() => toggle('positions', p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Group>

      <Group label="Typ" hint={reel.types.length ? undefined : 'môžeš vybrať viac'}>
        <div className="chips">
          {uniq([...settings.types, ...reel.types]).map((t) => (
            <Chip key={t} tone="type" size={size} on={reel.types.includes(t)} onClick={() => toggle('types', t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>

      <div className="pair">
        <Group label="Gi / No-gi">
          <Segmented label="Gi / No-gi" options={GIS} labels={GI_LABEL} value={reel.gi} allowNone size={size} onChange={(gi) => update(reel.id, { gi })} />
        </Group>
        <Group label="Úroveň">
          <Segmented label="Úroveň" options={LEVELS} labels={LEVEL_LABEL} value={reel.level} allowNone size={size} onChange={(level) => update(reel.id, { level })} />
        </Group>
      </div>

      <Group label="Stav">
        <Segmented
          label="Stav"
          options={STATUSES}
          labels={STATUS_LABEL}
          value={reel.status}
          size={size}
          stack
          prefix={(s) => <Belt status={s} />}
          onChange={(s) => update(reel.id, { status: s ?? 'new' })}
        />
      </Group>

      <Group label="Tagy">
        <TagInput tags={reel.tags} suggestions={suggestions} onChange={(tags) => update(reel.id, { tags })} />
      </Group>

      <Group label="Poznámky">
        <NotesField key={reel.id} reel={reel} />
      </Group>
    </div>
  );
}

export function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (t: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const parts = raw.split(',').map(normTag).filter(Boolean);
    const next = uniq([...tags, ...parts]);
    if (next.length !== tags.length) onChange(next);
    setText('');
  };
  const quick = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  return (
    <div className="tag-input">
      {tags.length > 0 && (
        <div className="chips">
          {tags.map((t) => (
            <span key={t} className="chip tag on static">
              #{t}
              <button type="button" className="x" aria-label={`Odobrať tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="input-row">
        <input
          className="input"
          list={listId}
          value={text}
          placeholder="napr. armbar, kimura, gordon ryan"
          enterKeyHint="done"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(',')) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            }
          }}
          onBlur={() => text.trim() && add(text)}
          aria-label="Nový tag"
        />
        <button type="button" className="btn" onClick={() => add(text)} disabled={!text.trim()}>
          Pridať
        </button>
      </div>
      {quick.length > 0 && (
        <div className="chips quick">
          {quick.map((s) => (
            <button key={s} type="button" className="chip ghost" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
      <datalist id={listId}>
        {suggestions.slice(0, 200).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

/** Poznámky sa ukladajú 0,6 s po poslednom písmene, pri opustení poľa a pri prechode na ďalší reel. */
function NotesField({ reel }: { reel: Reel }) {
  const { update } = useStore();
  const [val, setVal] = useState(reel.notes);
  const st = useRef({ val: reel.notes, dirty: false, timer: 0 });
  const id = reel.id;

  const flush = useCallback(() => {
    const s = st.current;
    window.clearTimeout(s.timer);
    if (!s.dirty) return;
    s.dirty = false;
    update(id, { notes: s.val });
  }, [update, id]);

  useEffect(() => flush, [flush]);

  return (
    <textarea
      className="input notes"
      value={val}
      rows={3}
      placeholder="Detaily, na čo si dať pozor, s kým to drilovať…"
      aria-label="Poznámky"
      onChange={(e) => {
        const v = e.target.value;
        setVal(v);
        const s = st.current;
        s.val = v;
        s.dirty = true;
        window.clearTimeout(s.timer);
        s.timer = window.setTimeout(flush, 600);
      }}
      onBlur={flush}
    />
  );
}
