import { useEffect, useMemo, useRef, useState } from 'react';
import { makeBackup, mergeBackup, mergeLists, parseBackup, type ParsedBackup } from '../lib/backup';
import { requestPersistence } from '../lib/db';
import { canShareFiles, downloadJson, readJsonFiles, shareJson } from '../lib/files';
import { isUnsorted } from '../lib/filters';
import { parseExportFiles, type ParsedExport, type ParsedFile } from '../lib/igExport';
import { BJJ_COLLECTION_RE, buildCandidates, defaultBjjSelection, looksLikeBjj, planImport, type Candidate, type ImportPlan } from '../lib/merge';
import { countBy, formatDate, plural, todayStamp, uniq } from '../lib/text';
import { navigate } from '../state/router';
import { useStore } from '../state/store';
import { usePersistentState } from '../state/usePersistentState';
import { DEFAULT_SETTINGS } from '../types';
import { Group, Segmented } from '../ui/controls';
import { useConfirm, useToast } from '../ui/feedback';
import { IconCheck, IconDown, IconDownload, IconPlus, IconShare, IconTrash, IconUp, IconUpload } from '../ui/icons';

export function SettingsView() {
  return (
    <div className="settings">
      <header className="page-head">
        <h1 className="display page-title">Nastavenia</h1>
      </header>
      <ImportPanel />
      <BackupPanel />
      <VideoPanel />
      <ListEditor field="positions" title="Pozície" tone="pos" />
      <ListEditor field="types" title="Typy" tone="type" />
      <StoragePanel />
    </div>
  );
}

// ---------------------------------------------------------------- import

interface Review {
  parsed: ParsedExport;
  cands: Map<string, Candidate>;
  collections: { name: string; total: number; fresh: number }[];
  noneFresh: number;
  noneBjjFresh: number;
  errors: string[];
}

const describeFile = (f: ParsedFile) =>
  f.kind === 'posts'
    ? `${f.posts} uložených príspevkov`
    : f.kind === 'collections'
      ? `${f.collections} kolekcií`
      : f.kind === 'mixed'
        ? `${f.posts} príspevkov, ${f.collections} kolekcií`
        : f.kind === 'fallback'
          ? `${f.posts} odkazov (neznámy formát)`
          : 'žiadne príspevky – preskočené';

export function ImportPanel() {
  const { byId, putMany, settings, saveSettings } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [mode, setMode] = useState<'smart' | 'all'>('smart');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<ImportPlan | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (list: FileList | File[]) => {
    const files = [...list];
    if (!files.length) return;
    setBusy(true);
    setResult(null);
    try {
      const { ok, errors } = await readJsonFiles(files);
      const parsed = parseExportFiles(ok);
      const cands = buildCandidates(parsed);
      if (!cands.size) {
        setReview(null);
        toast({
          text: errors.length ? errors.join(' ') : 'V súboroch nie sú uložené príspevky. Vyber saved_posts.json z exportu Instagramu.',
          tone: 'error',
        });
        return;
      }
      const isNew = (id: string) => !byId.has(id);
      const names = uniq(parsed.collections.map((c) => c.name));
      const stats = new Map<string, { total: number; fresh: number }>();
      for (const c of cands.values()) {
        for (const n of c.igCollections) {
          const s = stats.get(n) ?? { total: 0, fresh: 0 };
          s.total++;
          if (isNew(c.id)) s.fresh++;
          stats.set(n, s);
        }
      }
      const collections = names
        .map((name) => ({ name, ...(stats.get(name) ?? { total: 0, fresh: 0 }) }))
        .sort((a, b) => Number(BJJ_COLLECTION_RE.test(b.name)) - Number(BJJ_COLLECTION_RE.test(a.name)) || b.total - a.total);
      const none = [...cands.values()].filter((c) => !c.igCollections.length && isNew(c.id));
      setReview({ parsed, cands, collections, noneFresh: none.length, noneBjjFresh: none.filter(looksLikeBjj).length, errors });
      setSelected(new Set(defaultBjjSelection(names, settings.bjjCollections, settings.knownCollections)));
      setMode('smart');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const plan = useMemo(
    () => (review ? planImport(byId, review.cands, { mode, collections: [...selected] }) : null),
    [review, byId, mode, selected],
  );

  const run = async () => {
    if (!review || !plan) return;
    setBusy(true);
    try {
      await putMany(plan.toPut);
      const names = review.collections.map((c) => c.name);
      await saveSettings((s) => ({
        ...s,
        bjjCollections: mode === 'smart' ? uniq([...(s.bjjCollections ?? []).filter((n) => !names.includes(n)), ...selected]) : s.bjjCollections,
        knownCollections: uniq([...s.knownCollections, ...names]),
      }));
      void requestPersistence();
      setResult(plan);
      setReview(null);
      toast(plan.added ? `Importované: ${plan.added} ${plural(plan.added, 'reel', 'reely', 'reelov')}` : 'Údaje doplnené');
    } catch (e) {
      toast({ text: `Import zlyhal: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (name: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  return (
    <section className="panel" id="import">
      <h2 className="display">Import z Instagramu</h2>
      {!review && (
        <>
          <p className="lead">
            Vyber <b>saved_posts.json</b> a <b>saved_collections.json</b> z exportu Instagramu (formát JSON). Spracujú sa len v tomto prehliadači,
            nikam sa neposielajú. Opakovaný import pridá len nové reels.
          </p>
          <label
            className={`dropzone${drag ? ' drag' : ''}${busy ? ' busy' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void onFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="visually-hidden"
              data-import-input
              onChange={(e) => e.target.files && void onFiles(e.target.files)}
            />
            <IconUpload size={22} />
            <span className="dz-title">{busy ? 'Načítavam…' : 'Vybrať súbory z exportu'}</span>
            <span className="faint">alebo ich sem pretiahni</span>
          </label>
        </>
      )}

      {review && plan && (
        <div className="review">
          <ul className="file-list">
            {review.parsed.files.map((f) => (
              <li key={f.name}>
                <b>{f.name}</b> <span className="faint">– {describeFile(f)}</span>
              </li>
            ))}
          </ul>
          {[...review.errors, ...review.parsed.warnings].map((w) => (
            <p key={w} className="note warn">
              {w}
            </p>
          ))}

          <div className="stat-row">
            <div className="stat">
              <b className="display num">{review.cands.size}</b>
              <span>v exporte</span>
            </div>
            <div className="stat">
              <b className="display num">{plan.added}</b>
              <span>nových</span>
            </div>
            <div className="stat">
              <b className="display num">{plan.existing}</b>
              <span>už v appke</span>
            </div>
          </div>

          {plan.added > 0 && (
            <>
              <Group label="Čo patrí do BJJ knižnice">
                <Segmented
                  label="Čo patrí do BJJ knižnice"
                  options={['smart', 'all'] as const}
                  labels={{ smart: 'Podľa kolekcií', all: 'Všetko' }}
                  value={mode}
                  onChange={(v) => setMode(v ?? 'smart')}
                />
              </Group>
              {mode === 'smart' && (
                <>
                  <p className="hint">
                    Reels z označených IG kolekcií pôjdu do knižnice, ostatné do „Mimo BJJ“ (nájdeš ich cez filter a kedykoľvek vrátiš).
                  </p>
                  {review.collections.length > 0 && (
                    <div className="checklist" role="group" aria-label="Kolekcie z Instagramu">
                      {review.collections.map((c) => (
                        <label key={c.name}>
                          <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggle(c.name)} />
                          <span className="name">{c.name}</span>
                          <span className="faint num">{c.fresh < c.total ? `${c.fresh} nových z ${c.total}` : c.total}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {review.noneFresh > 0 && (
                    <p className="hint">
                      Bez kolekcie: {review.noneFresh} nových. Z nich {review.noneBjjFresh} vyzerá podľa hashtagov a popisu ako BJJ – tie pôjdu do
                      knižnice.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          <p className="summary-line">
            {plan.added > 0 ? (
              <>
                Pridá sa <b>{plan.added}</b>: <b>{plan.addedBjj}</b> do knižnice, <b>{plan.added - plan.addedBjj}</b> do „Mimo BJJ“.
              </>
            ) : (
              'Žiadne nové reels.'
            )}
            {plan.enriched > 0 && ` Pri ${plan.enriched} existujúcich sa doplnia chýbajúce údaje (autor, popis, IG kolekcie).`}
            {plan.existing > 0 && ' Tvoje triedenie sa nemení.'}
          </p>

          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setReview(null)}>
              Zrušiť
            </button>
            <button type="button" className="btn primary" disabled={busy || !plan.toPut.length} onClick={() => void run()}>
              {plan.added ? `Importovať ${plan.added}` : plan.enriched ? `Doplniť ${plan.enriched}` : 'Nič nové'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="result">
          <p>
            <IconCheck size={18} /> Hotovo. Pridaných {result.added} ({result.addedBjj} do knižnice, {result.added - result.addedBjj} mimo BJJ)
            {result.existing ? `, ${result.existing} už bolo v appke` : ''}
            {result.enriched ? `, ${result.enriched} doplnených` : ''}.
          </p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => navigate('sort', true)}>
              Začať triediť
            </button>
            <button type="button" className="btn" onClick={() => navigate('', true)}>
              Do knižnice
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- záloha

function BackupPanel() {
  const { reels, settings, byId, putMany, replaceAll, saveSettings } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, setPending] = useState<(ParsedBackup & { name: string }) | null>(null);
  const [lastBackup, setLastBackup] = usePersistentState<number>('bjj.lastBackup', 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareable = useMemo(canShareFiles, []);
  const fileName = () => `bjj-reels-zaloha-${todayStamp()}.json`;

  const doExport = () => {
    const name = fileName();
    downloadJson(name, makeBackup(reels, settings));
    setLastBackup(Date.now());
    toast(`Záloha stiahnutá: ${name}`);
  };
  const doShare = async () => {
    try {
      if (await shareJson(fileName(), makeBackup(reels, settings))) setLastBackup(Date.now());
    } catch (e) {
      toast({ text: `Zdieľanie zlyhalo: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' });
    }
  };
  const onFile = async (f: File) => {
    try {
      setPending({ ...parseBackup(JSON.parse(await f.text())), name: f.name });
    } catch (e) {
      toast({ text: e instanceof SyntaxError ? `${f.name}: nie je platný JSON.` : (e as Error).message, tone: 'error' });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const merge = async () => {
    if (!pending) return;
    const m = mergeBackup(byId, pending.reels);
    try {
      await putMany(m.toPut);
      const ps = pending.settings;
      await saveSettings((s) => ({
        ...s,
        positions: mergeLists(s.positions, ps.positions ?? []),
        types: mergeLists(s.types, ps.types ?? []),
        bjjCollections: s.bjjCollections ?? ps.bjjCollections ?? null,
        knownCollections: uniq([...s.knownCollections, ...(ps.knownCollections ?? [])]),
      }));
      toast(`Zlúčené: ${m.added} nových, ${m.updated} aktualizovaných, ${m.kept} bez zmeny`);
      setPending(null);
    } catch (e) {
      toast({ text: `Zlúčenie zlyhalo: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' });
    }
  };
  const restore = async () => {
    if (!pending) return;
    const ok = await confirm({
      title: 'Nahradiť všetky dáta zálohou?',
      body: `Teraz máš ${reels.length} reels, po obnovení ich bude ${pending.reels.length} – presne podľa zálohy. Zmeny urobené po jej vytvorení sa stratia.`,
      confirm: 'Nahradiť',
      danger: true,
    });
    if (!ok) return;
    try {
      await replaceAll(pending.reels, { ...DEFAULT_SETTINGS, showVideo: settings.showVideo, ...pending.settings });
      toast('Obnovené zo zálohy');
      setPending(null);
    } catch (e) {
      toast({ text: `Obnova zlyhala: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' });
    }
  };

  return (
    <section className="panel" id="backup">
      <h2 className="display">Záloha</h2>
      <p className="lead">
        Všetky reels aj tvoje triedenie v jednom JSON súbore. Slúži aj na prenos medzi mobilom a počítačom – zariadenia sa samé nesynchronizujú.
      </p>
      <p className="faint small">{lastBackup ? `Posledná záloha z tohto zariadenia: ${formatDate(lastBackup)}` : 'Z tohto zariadenia zatiaľ žiadna záloha.'}</p>
      <div className="row">
        <button type="button" className="btn primary" onClick={doExport} disabled={!reels.length}>
          <IconDownload size={18} /> Stiahnuť zálohu
        </button>
        {shareable && (
          <button type="button" className="btn" onClick={() => void doShare()} disabled={!reels.length}>
            <IconShare size={18} /> Poslať…
          </button>
        )}
        <label className="btn">
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            data-backup-input
            onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
          />
          <IconUpload size={18} /> Obnoviť zo zálohy
        </label>
      </div>
      {pending && (
        <div className="review">
          <p>
            <b>{pending.name}</b>: {pending.reels.length} reels
            {pending.exportedAt && `, vytvorená ${formatDate(Date.parse(pending.exportedAt))}`}
            {pending.skipped ? ` (${pending.skipped} chybných záznamov preskočených)` : ''}.
          </p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => void merge()}>
              Zlúčiť
            </button>
            <button type="button" className="btn danger" onClick={() => void restore()}>
              Nahradiť všetko
            </button>
            <button type="button" className="btn ghost" onClick={() => setPending(null)}>
              Zrušiť
            </button>
          </div>
          <p className="hint">
            <b>Zlúčiť</b> pridá chýbajúce reels a pri rovnakých nechá novšiu úpravu. <b>Nahradiť</b> vráti stav presne podľa zálohy.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- videá

function VideoPanel() {
  const { settings, saveSettings } = useStore();
  return (
    <section className="panel" id="video">
      <h2 className="display">Videá</h2>
      <label className="switch big">
        <input type="checkbox" checked={settings.showVideo} onChange={(e) => void saveSettings((s) => ({ ...s, showVideo: e.target.checked }))} />
        <span>Zobrazovať videá priamo v appke</span>
      </label>
      <p className="lead">
        Používa oficiálny Instagram embed – nič sa nesťahuje, video sa prehrá z Instagramu (treba internet). Reels s pôvodným zvukom sa
        prehrajú priamo tu. Pri reeloch s licencovanou hudbou Instagram prehrávanie mimo svojej appky nepovoľuje – ukáže „Watch on Instagram“
        a otvorí reel u seba. Instagram pri tom vidí, ktoré reels si pozeráš, rovnako ako keď ich otvoríš priamo.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- zoznamy pozícií a typov

function ListEditor({ field, title, tone }: { field: 'positions' | 'types'; title: string; tone: 'pos' | 'type' }) {
  const { settings, saveSettings, reels, updateMany } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const list = settings[field];
  const usage = useMemo(() => countBy(reels.flatMap((r) => r[field])), [reels, field]);
  const orphans = [...usage.keys()].filter((k) => !list.includes(k)).sort();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ old: string; value: string } | null>(null);

  const clean = (v: string) => v.trim().replace(/\s+/g, ' ');
  const exists = (v: string, except?: string) => list.some((x) => x !== except && x.toLowerCase() === v.toLowerCase());
  const setList = (next: string[]) => saveSettings((s) => ({ ...s, [field]: next }));
  const idsWith = (v: string) => reels.filter((r) => r[field].includes(v)).map((r) => r.id);

  const add = (raw = draft) => {
    const v = clean(raw);
    if (!v) return;
    if (exists(v)) {
      toast(`„${v}“ už v zozname je`);
      return;
    }
    void setList([...list, v]);
    setDraft('');
  };
  const rename = async () => {
    if (!editing) return;
    const { old } = editing;
    const v = clean(editing.value);
    setEditing(null);
    if (!v || v === old) return;
    if (exists(v, old)) {
      toast(`„${v}“ už v zozname je`);
      return;
    }
    await setList(list.map((x) => (x === old ? v : x)));
    const n = await updateMany(idsWith(old), (r) => ({ [field]: uniq(r[field].map((x) => (x === old ? v : x))) }));
    if (n) toast(`Premenované aj v ${n} ${plural(n, 'reeli', 'reeloch', 'reeloch')}`);
  };
  const del = async (v: string) => {
    const n = usage.get(v) ?? 0;
    if (n) {
      const ok = await confirm({
        title: `Odstrániť „${v}“?`,
        body: `Používa ho ${n} ${plural(n, 'reel', 'reely', 'reelov')}. Hodnota sa odstráni aj z nich.`,
        confirm: 'Odstrániť',
        danger: true,
      });
      if (!ok) return;
      await updateMany(idsWith(v), (r) => ({ [field]: r[field].filter((x) => x !== v) }));
    }
    void setList(list.filter((x) => x !== v));
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    void setList(next);
  };

  return (
    <section className="panel">
      <h2 className="display">{title}</h2>
      <p className="lead">Poradie tu je poradie tlačidiel pri triedení. Ťukni na názov a premenuj ho – zmení sa aj v otriedených reeloch.</p>
      <ul className="list-editor">
        {list.map((v, i) => (
          <li key={v}>
            {editing?.old === v ? (
              <input
                className="input"
                autoFocus
                value={editing.value}
                aria-label={`Nový názov pre ${v}`}
                onChange={(e) => setEditing({ old: v, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void rename();
                  if (e.key === 'Escape') setEditing(null);
                }}
                onBlur={() => void rename()}
              />
            ) : (
              <button type="button" className={`chip ${tone} on name-btn`} onClick={() => setEditing({ old: v, value: v })} title="Premenovať">
                {v}
              </button>
            )}
            <span className="usage faint num" title="Počet reels s touto hodnotou">
              {usage.get(v) ?? 0}
            </span>
            <button type="button" className="icon-btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Posunúť ${v} vyššie`}>
              <IconUp size={18} />
            </button>
            <button type="button" className="icon-btn ghost sm" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Posunúť ${v} nižšie`}>
              <IconDown size={18} />
            </button>
            <button type="button" className="icon-btn ghost sm" onClick={() => void del(v)} aria-label={`Odstrániť ${v}`}>
              <IconTrash size={17} />
            </button>
          </li>
        ))}
      </ul>
      <div className="input-row">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={field === 'positions' ? 'Nová pozícia, napr. de la riva' : 'Nový typ, napr. counter'}
          aria-label={field === 'positions' ? 'Nová pozícia' : 'Nový typ'}
        />
        <button type="button" className="btn" onClick={() => add()} disabled={!draft.trim()}>
          <IconPlus size={18} /> Pridať
        </button>
      </div>
      {orphans.length > 0 && (
        <p className="hint">
          Používané, ale nie v zozname:{' '}
          {orphans.map((o) => (
            <button key={o} type="button" className="link-btn" onClick={() => add(o)}>
              + {o}
            </button>
          ))}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- úložisko

function StoragePanel() {
  const { reels, replaceAll } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState('');

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => {});
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsage(e.usage ? `${(e.usage / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : ''), () => {});
  }, [reels.length]);

  const counts = useMemo(() => {
    const bjj = reels.filter((r) => !r.hidden);
    return { bjj: bjj.length, hidden: reels.length - bjj.length, sorted: bjj.filter((r) => !isUnsorted(r)).length };
  }, [reels]);

  const wipe = async () => {
    const ok = await confirm({
      title: 'Vymazať všetky dáta v tomto prehliadači?',
      body: `Zmizne ${reels.length} reels a celé triedenie. Nedá sa to vrátiť – najprv si stiahni zálohu.`,
      confirm: 'Vymazať všetko',
      danger: true,
    });
    if (!ok) return;
    await replaceAll([], { ...DEFAULT_SETTINGS });
    toast('Všetko vymazané');
  };

  return (
    <section className="panel">
      <h2 className="display">Úložisko</h2>
      <div className="stat-row">
        <div className="stat">
          <b className="display num">{counts.bjj}</b>
          <span>v BJJ knižnici</span>
        </div>
        <div className="stat">
          <b className="display num">{counts.sorted}</b>
          <span>otriedených</span>
        </div>
        <div className="stat">
          <b className="display num">{counts.hidden}</b>
          <span>mimo BJJ</span>
        </div>
      </div>
      <p className="lead">
        Dáta sú len v tomto prehliadači{usage && ` (${usage})`} – žiadny server, žiadny účet. Appka funguje aj offline.{' '}
        {persisted === true && 'Prehliadač ich má označené ako trvalé.'}
        {persisted === false && (
          <>
            Prehliadač ich môže pri nedostatku miesta zmazať:{' '}
            <button type="button" className="link-btn" onClick={async () => setPersisted(await requestPersistence())}>
              požiadať o trvalé úložisko
            </button>{' '}
            a pravidelne zálohuj.
          </>
        )}
      </p>
      <button type="button" className="btn danger" onClick={() => void wipe()} disabled={!reels.length}>
        <IconTrash size={18} /> Vymazať všetky dáta
      </button>
    </section>
  );
}
