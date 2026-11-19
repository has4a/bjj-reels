import { useState } from 'react';
import { normTag, plural, uniq } from '../lib/text';
import { useStore } from '../state/store';
import { GIS, GI_LABEL, LEVELS, LEVEL_LABEL, STATUSES, STATUS_LABEL, type Gi, type Level, type Reel, type Status } from '../types';
import { Chip, Group, Segmented, Sheet } from '../ui/controls';
import { useConfirm, useToast } from '../ui/feedback';

type Mode = 'add' | 'remove';
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Hromadná úprava všetkých reels, ktoré práve vyhovujú filtrom (napr. celá IG kolekcia „BJJ - armbar“). */
export function BulkSheet({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { settings, updateMany } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('add');
  const [pos, setPos] = useState<string[]>([]);
  const [typ, setTyp] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [gi, setGi] = useState<Gi | 'none' | ''>('');
  const [level, setLevel] = useState<Level | 'none' | ''>('');
  const [status, setStatus] = useState<Status | ''>('');
  const [vis, setVis] = useState<'' | 'bjj' | 'hidden'>('');

  const tags = uniq(tagText.split(',').map(normTag).filter(Boolean));
  const verb = mode === 'add' ? 'Pridať' : 'Odobrať';
  const changes = [
    pos.length && `${verb} pozíciu: ${pos.join(', ')}`,
    typ.length && `${verb} typ: ${typ.join(', ')}`,
    tags.length && `${verb} tagy: ${tags.map((t) => '#' + t).join(' ')}`,
    gi && `Gi / No-gi: ${gi === 'none' ? 'nezadané' : GI_LABEL[gi]}`,
    level && `Úroveň: ${level === 'none' ? 'nezadaná' : LEVEL_LABEL[level]}`,
    status && `Stav: ${STATUS_LABEL[status]}`,
    vis && (vis === 'hidden' ? 'Presunúť do „Mimo BJJ“' : 'Vrátiť medzi BJJ'),
  ].filter(Boolean) as string[];

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const apply = async () => {
    const ok = await confirm({
      title: `Upraviť ${ids.length} ${plural(ids.length, 'reel', 'reely', 'reelov')}?`,
      body: changes.join('\n'),
      confirm: 'Použiť',
    });
    if (!ok) return;
    const edit = (cur: string[], vals: string[]) => (mode === 'add' ? uniq([...cur, ...vals]) : cur.filter((x) => !vals.includes(x)));
    const n = await updateMany(ids, (r) => {
      const p: Partial<Reel> = {};
      if (pos.length) {
        const nx = edit(r.positions, pos);
        if (!same(nx, r.positions)) p.positions = nx;
      }
      if (typ.length) {
        const nx = edit(r.types, typ);
        if (!same(nx, r.types)) p.types = nx;
      }
      if (tags.length) {
        const nx = edit(r.tags, tags);
        if (!same(nx, r.tags)) p.tags = nx;
      }
      if (gi) {
        const v = gi === 'none' ? null : gi;
        if (r.gi !== v) p.gi = v;
      }
      if (level) {
        const v = level === 'none' ? null : level;
        if (r.level !== v) p.level = v;
      }
      if (status && r.status !== status) p.status = status;
      if (vis) {
        const h = vis === 'hidden';
        if (r.hidden !== h) p.hidden = h;
      }
      return Object.keys(p).length ? p : null;
    });
    toast(n ? `Upravené: ${n} ${plural(n, 'reel', 'reely', 'reelov')}` : 'Nebolo čo meniť – všetky už tak boli.');
    onClose();
  };

  return (
    <Sheet
      title={`Hromadne · ${ids.length}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Zrušiť
          </button>
          <button type="button" className="btn primary grow" disabled={!changes.length} onClick={apply}>
            Použiť na {ids.length}
          </button>
        </>
      }
    >
      <p className="hint lead">
        Zmena sa použije na všetkých {ids.length} {plural(ids.length, 'reel', 'reely', 'reelov')} zo zoznamu podľa aktuálnych filtrov.
        Typicky: vyfiltruj IG kolekciu (napr. „BJJ - armbar“) a pridaj jej typ a tag naraz.
      </p>

      <Group label="Pozície, typy, tagy">
        <Segmented label="Pridať alebo odobrať" options={['add', 'remove'] as const} labels={{ add: 'Pridať', remove: 'Odobrať' }} value={mode} onChange={(v) => setMode(v ?? 'add')} />
      </Group>
      <Group label="Pozícia">
        <div className="chips">
          {settings.positions.map((p) => (
            <Chip key={p} tone="pos" on={pos.includes(p)} onClick={() => toggle(pos, setPos, p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Group>
      <Group label="Typ">
        <div className="chips">
          {settings.types.map((t) => (
            <Chip key={t} tone="type" on={typ.includes(t)} onClick={() => toggle(typ, setTyp, t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>
      <Group label="Tagy" hint="oddeľ čiarkou">
        <input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="armbar, closed guard attack" autoCapitalize="none" aria-label="Tagy" />
      </Group>

      <Group label="Nastaviť">
        <div className="field-grid">
          <label className="field">
            <span>Gi / No-gi</span>
            <select className="select" value={gi} onChange={(e) => setGi(e.target.value as Gi | 'none' | '')}>
              <option value="">nemeniť</option>
              {GIS.map((g) => (
                <option key={g} value={g}>
                  {GI_LABEL[g]}
                </option>
              ))}
              <option value="none">zrušiť</option>
            </select>
          </label>
          <label className="field">
            <span>Úroveň</span>
            <select className="select" value={level} onChange={(e) => setLevel(e.target.value as Level | 'none' | '')}>
              <option value="">nemeniť</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
              <option value="none">zrušiť</option>
            </select>
          </label>
          <label className="field">
            <span>Stav</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
              <option value="">nemeniť</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Knižnica</span>
            <select className="select" value={vis} onChange={(e) => setVis(e.target.value as '' | 'bjj' | 'hidden')}>
              <option value="">nemeniť</option>
              <option value="bjj">BJJ</option>
              <option value="hidden">Mimo BJJ</option>
            </select>
          </label>
        </div>
      </Group>
    </Sheet>
  );
}
