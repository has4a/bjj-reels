import { useEffect, useRef, useState } from 'react';
import { ReelEditor } from './components/ReelEditor';
import { newReel } from './lib/merge';
import { extractLink } from './lib/url';
import { applyUpdate, onUpdateAvailable, updatePending } from './pwa';
import { navigate, reelPath, useRoute } from './state/router';
import { StoreProvider, useStore } from './state/store';
import { BrandMark } from './ui/controls';
import { FeedbackProvider, useToast } from './ui/feedback';
import { IconBolt, IconList, IconPlus, IconSliders } from './ui/icons';
import { AddView } from './views/AddView';
import { ListView } from './views/ListView';
import { QuickSortView } from './views/QuickSortView';
import { SettingsView } from './views/SettingsView';

export function App() {
  return (
    <FeedbackProvider>
      <StoreWithErrors />
    </FeedbackProvider>
  );
}

function StoreWithErrors() {
  const toast = useToast();
  return (
    <StoreProvider onError={(text) => toast({ text, tone: 'error' })}>
      <Shell />
    </StoreProvider>
  );
}

const TABS = [
  { key: 'list', path: '', label: 'Knižnica', Icon: IconList },
  { key: 'sort', path: 'sort', label: 'Triediť', Icon: IconBolt },
  { key: 'add', path: 'add', label: 'Pridať', Icon: IconPlus },
  { key: 'settings', path: 'settings', label: 'Nastavenia', Icon: IconSliders },
] as const;

function Shell() {
  const { ready, fatal } = useStore();
  const route = useRoute();
  const prefill = useShareTarget();
  const update = useUpdateAvailable();
  const base = route.name === 'reel' ? 'list' : route.name;

  if (fatal) {
    return (
      <div className="fatal">
        <BrandMark />
        <h1 className="display">Úložisko nie je dostupné</h1>
        <p>{fatal}</p>
        <p className="muted">Skús appku otvoriť v bežnom (nie súkromnom) okne prehliadača.</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="splash" aria-busy="true">
        <BrandMark />
      </div>
    );
  }

  return (
    <div className="app">
      {update && (
        <div className="update-banner" role="status">
          <span>Je k dispozícii nová verzia appky.</span>
          <button type="button" className="btn sm primary" onClick={applyUpdate}>
            Aktualizovať
          </button>
        </div>
      )}
      <main className={`view view-${base}`}>
        {base === 'sort' ? <QuickSortView /> : base === 'add' ? <AddView prefill={prefill} /> : base === 'settings' ? <SettingsView /> : <ListView />}
      </main>
      {route.name === 'reel' && <ReelEditor key={route.id} id={route.id} />}
      <nav className="nav" aria-label="Hlavná navigácia">
        {TABS.map(({ key, path, label, Icon }) => (
          <a
            key={key}
            href={'#/' + path}
            className={base === key ? 'on' : undefined}
            aria-current={base === key ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(path, true);
              window.scrollTo({ top: 0 });
            }}
          >
            <Icon size={21} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

/**
 * PWA share target (Android): Instagram -> Zdieľať -> BJJ Reels otvorí ./?url=…&text=…
 * Reel sa hneď pridá a otvorí sa jeho triedenie. Parametre sa potom z adresy odstránia.
 */
function useShareTarget(): string | undefined {
  const { ready, byId, putMany } = useStore();
  const toast = useToast();
  const [prefill, setPrefill] = useState<string>();
  const handled = useRef(false);

  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    const sp = new URLSearchParams(location.search);
    const shared = ['url', 'text', 'title']
      .map((k) => sp.get(k))
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!shared) return;
    history.replaceState(null, '', location.pathname + (location.hash || '#/'));

    const link = extractLink(shared);
    if (!link) {
      setPrefill(shared);
      navigate('add', true);
      toast({ text: 'V zdieľanom texte nie je odkaz.', tone: 'error' });
      return;
    }
    const existing = byId.get(link.id);
    if (existing) {
      navigate(reelPath(existing.id));
      toast('Tento reel už máš');
      return;
    }
    putMany([newReel({ id: link.id, url: link.url, kind: link.kind, source: 'manual' })]).then(
      () => {
        navigate(reelPath(link.id));
        toast('Pridané zo zdieľania. Teraz ho otrieď.');
      },
      (e: unknown) => toast({ text: `Uloženie zlyhalo: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' }),
    );
  }, [ready, byId, putMany, toast]);

  return prefill;
}

function useUpdateAvailable() {
  const [available, setAvailable] = useState(updatePending);
  useEffect(() => onUpdateAvailable(() => setAvailable(true)), []);
  return available;
}
