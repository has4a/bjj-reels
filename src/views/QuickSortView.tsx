import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Classifier } from '../components/Classifier';
import { ReelSummary } from '../components/ReelSummary';
import { byNewest, isUnsorted } from '../lib/filters';
import { countBy } from '../lib/text';
import { navigate } from '../state/router';
import { useStore } from '../state/store';
import { usePersistentState } from '../state/usePersistentState';
import type { Reel } from '../types';
import { ProgressBelt } from '../ui/controls';
import { useToast } from '../ui/feedback';
import { IconEyeOff, IconLeft, IconRight } from '../ui/icons';

/**
 * Rýchle triedenie: jeden netriedený reel naraz.
 * Fronta je snímka pri otvorení (aby reel nezmizol hneď po prvom ťuknutí), každá zmena sa ukladá okamžite.
 * Preskočené reels idú pri ďalšom prechode na koniec.
 */
export function QuickSortView() {
  const { reels, byId, update, settings, saveSettings } = useStore();
  const toast = useToast();
  const [source, setSource] = usePersistentState<string>('bjj.qs.source', 'all');
  const [skipped, setSkipped] = usePersistentState<string[]>('bjj.qs.skipped', []);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [doneNow, setDoneNow] = useState<Set<string>>(() => new Set());
  const [fresh, setFresh] = useState<number>();

  const visible = useMemo(() => reels.filter((r) => !r.hidden), [reels]);
  const unsorted = useMemo(() => visible.filter(isUnsorted), [visible]);
  const sortedCount = visible.length - unsorted.length;
  const sources = useMemo(
    () => [...countBy(unsorted.flatMap((r) => r.igCollections)).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [unsorted],
  );
  const noCollection = useMemo(() => unsorted.filter((r) => !r.igCollections.length).length, [unsorted]);

  const build = useCallback(
    (src: string, skip: string[]) => {
      const inSrc = (r: Reel) => src === 'all' || (src === 'none' ? r.igCollections.length === 0 : r.igCollections.includes(src.slice(4)));
      const cands = reels.filter((r) => !r.hidden && isUnsorted(r) && inSrc(r)).sort(byNewest);
      const sk = new Set(skip);
      return [...cands.filter((r) => !sk.has(r.id)), ...cands.filter((r) => sk.has(r.id))].map((r) => r.id);
    },
    [reels],
  );

  // fronta sa skladá len pri otvorení a pri zmene zdroja (zámerne nie pri každej zmene dát)
  const buildRef = useRef(build);
  buildRef.current = build;
  const skippedRef = useRef(skipped);
  skippedRef.current = skipped;
  useEffect(() => {
    setQueue(buildRef.current(source, skippedRef.current));
    setIdx(0);
  }, [source]);

  const curId = queue?.[idx];
  const cur = curId ? byId.get(curId) : undefined;

  // reel medzičasom zmazaný alebo skrytý inde -> preskoč
  useEffect(() => {
    if (curId && !cur) setIdx((i) => i + 1);
  }, [curId, cur]);

  // stripe za každých 25 %
  const stripes = visible.length ? Math.floor((sortedCount / visible.length) * 4 + 1e-9) : 0;
  const prevStripes = useRef(stripes);
  useEffect(() => {
    if (stripes > prevStripes.current) {
      setFresh(stripes);
      toast(stripes === 4 ? 'Štvrtý stripe – celá knižnica vytriedená!' : `Nový stripe – ${stripes * 25} % vytriedené`);
    }
    prevStripes.current = stripes;
  }, [stripes, toast]);

  const next = useCallback(() => {
    if (!cur) return;
    const sorted = !isUnsorted(cur);
    setSkipped((s) => (sorted ? s.filter((x) => x !== cur.id) : s.includes(cur.id) ? s : [...s, cur.id]));
    if (sorted) setDoneNow((d) => new Set(d).add(cur.id));
    setIdx((i) => i + 1);
    window.scrollTo({ top: 0 });
  }, [cur, setSkipped]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0 });
  }, []);

  const hide = () => {
    if (!cur || !queue) return;
    const id = cur.id;
    update(id, { hidden: true });
    setIdx((i) => i + 1);
    window.scrollTo({ top: 0 });
    toast({
      text: 'Presunuté do „Mimo BJJ“',
      action: {
        label: 'Vrátiť',
        run: () => {
          update(id, { hidden: false });
          setIdx(Math.max(0, queue.indexOf(id)));
        },
      },
    });
  };

  const restart = () => {
    setQueue(build(source, skipped));
    setIdx(0);
  };

  // klávesnica: → / Enter = ďalší, ← = späť (nie keď píšeš)
  const keys = useRef({ next, prev });
  keys.current = { next, prev };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.sheet-backdrop, .dialog-backdrop')) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !t.closest('button, a'))) {
        e.preventDefault();
        keys.current.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        keys.current.prev();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const pct = visible.length ? Math.round((sortedCount / visible.length) * 100) : 0;
  const srcMissing = source.startsWith('col:') && !sources.some(([n]) => 'col:' + n === source);

  return (
    <div className="qs">
      <header className="qs-head">
        <div className="qs-title-row">
          <h1 className="display page-title">Triedenie</h1>
          <div className="display num qs-count" aria-label={`Vytriedené ${sortedCount} z ${visible.length}`}>
            {sortedCount}
            <small>/{visible.length}</small>
          </div>
        </div>
        <ProgressBelt done={sortedCount} total={visible.length} fresh={fresh} />
        <div className="qs-meta">
          <span className="num">
            {pct} % · zostáva {unsorted.length}
          </span>
          {doneNow.size > 0 && <span className="num">teraz +{doneNow.size}</span>}
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="empty">
          <p>V knižnici zatiaľ nie sú žiadne BJJ reels.</p>
          <button type="button" className="btn primary" onClick={() => navigate('', true)}>
            Importovať export
          </button>
        </div>
      ) : (
        <>
          <div className="qs-controls">
            <select className="select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Čo triediť">
              <option value="all">Všetky netriedené ({unsorted.length})</option>
              {noCollection > 0 && <option value="none">Bez IG kolekcie ({noCollection})</option>}
              {srcMissing && <option value={source}>{source.slice(4)} (0)</option>}
              {sources.length > 0 && (
                <optgroup label="IG kolekcia">
                  {sources.map(([n, c]) => (
                    <option key={n} value={'col:' + n}>
                      {n} ({c})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <label className="switch" title="Načíta oficiálny Instagram embed priamo tu (potrebuje internet)">
              <input type="checkbox" checked={settings.preview} onChange={(e) => void saveSettings((s) => ({ ...s, preview: e.target.checked }))} />
              <span>Náhľad</span>
            </label>
          </div>

          {cur ? (
            <>
              <div className="qs-pos faint num">
                {idx + 1} / {queue?.length ?? 0}
              </div>
              <div className="qs-card">
                <ReelSummary reel={cur} preview={settings.preview} />
              </div>
              <Classifier reel={cur} size="lg" />
              <div className="qs-actions">
                <div className="qs-actions-inner">
                  <button type="button" className="btn lg" onClick={prev} disabled={idx === 0} aria-label="Predchádzajúci reel">
                    <IconLeft />
                  </button>
                  <button type="button" className="btn lg" onClick={hide}>
                    <IconEyeOff size={18} /> Mimo BJJ
                  </button>
                  <button type="button" className="btn primary lg" onClick={next}>
                    Ďalší <IconRight />
                  </button>
                </div>
              </div>
            </>
          ) : (
            queue && (
              <div className="empty done">
                <h2 className="display">{unsorted.length === 0 ? 'Všetko vytriedené' : 'Koniec fronty'}</h2>
                <p className="muted">
                  {unsorted.length === 0
                    ? 'Každý BJJ reel má pozíciu alebo typ. Nové pridáš importom alebo cez Pridať.'
                    : `Netriedených zostáva ${unsorted.length} – preskočené alebo mimo zvoleného výberu.`}
                </p>
                <div className="row center">
                  {unsorted.length > 0 && (
                    <button type="button" className="btn primary" onClick={restart}>
                      Prejsť znova
                    </button>
                  )}
                  {source !== 'all' && unsorted.length > 0 && (
                    <button type="button" className="btn" onClick={() => setSource('all')}>
                      Všetky netriedené
                    </button>
                  )}
                  <button type="button" className="btn ghost" onClick={() => navigate('', true)}>
                    Do knižnice
                  </button>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
