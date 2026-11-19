import { useMemo, useState } from 'react';
import { newReel } from '../lib/merge';
import { formatDate } from '../lib/text';
import { extractLink } from '../lib/url';
import { navigate, reelPath } from '../state/router';
import { useStore } from '../state/store';
import { useToast } from '../ui/feedback';
import { IconClipboard, IconPlus } from '../ui/icons';

export function AddView({ prefill }: { prefill?: string }) {
  const { byId, putMany } = useStore();
  const toast = useToast();
  const [text, setText] = useState(prefill ?? '');
  const [busy, setBusy] = useState(false);
  const link = useMemo(() => (text.trim() ? extractLink(text) : null), [text]);
  const existing = link ? byId.get(link.id) : undefined;
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      toast({ text: 'Prehliadač nedovolil čítať schránku. Podrž prst v poli a zvoľ Prilepiť.', tone: 'error' });
    }
  };

  const add = async () => {
    if (!link || busy) return;
    if (existing) {
      navigate(reelPath(existing.id));
      return;
    }
    setBusy(true);
    try {
      await putMany([newReel({ id: link.id, url: link.url, kind: link.kind, source: 'manual' })]);
      setText('');
      toast('Pridané. Teraz ho otrieď.');
      navigate(reelPath(link.id));
    } catch (e) {
      toast({ text: `Uloženie zlyhalo: ${e instanceof Error ? e.message : String(e)}`, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="add">
      <header className="page-head">
        <h1 className="display page-title">Pridať reel</h1>
      </header>

      <section className="panel">
        <label className="eyebrow" htmlFor="add-url">
          Odkaz z Instagramu
        </label>
        <div className="input-row">
          <input
            id="add-url"
            className="input lg"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.instagram.com/reel/…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void add()}
          />
          {canPaste && (
            <button type="button" className="btn" onClick={paste}>
              <IconClipboard size={18} /> Vložiť
            </button>
          )}
        </div>

        {text.trim() && !link && <p className="note error">Toto nevyzerá ako odkaz. V Instagrame ťukni na ⋯ → Kopírovať odkaz a vlož ho sem.</p>}
        {existing && (
          <p className="note">
            Tento reel už máš{existing.savedAt ? ` (uložený ${formatDate(existing.savedAt)})` : ''}.
          </p>
        )}
        {link && !existing && link.kind === 'other' && <p className="note warn">Nie je to odkaz na Instagram, ale uložiť sa dá.</p>}
        {link && !existing && link.kind === 'share' && (
          <p className="note warn">
            Zdieľací odkaz (/share/…) sa nedá spárovať s exportom. Po ďalšom importe môže byť tento reel v knižnici dvakrát – radšej použi „Kopírovať odkaz“.
          </p>
        )}

        <button type="button" className="btn primary lg block" disabled={!link || busy} onClick={() => void add()}>
          {existing ? (
            'Otvoriť triedenie'
          ) : (
            <>
              <IconPlus size={18} /> Pridať a triediť
            </>
          )}
        </button>
      </section>

      <section className="panel subtle">
        <h2 className="display">Rovno z Instagramu</h2>
        <p>
          <b>Android:</b> nainštaluj appku (Chrome → ⋮ → Inštalovať aplikáciu / Pridať na plochu). Potom v Instagrame pri reeli ťukni na Zdieľať →
          ďalšie možnosti → <b>BJJ Reels</b>. Reel sa pridá sám a otvorí sa triedenie.
        </p>
        <p>
          <b>iPhone:</b> Safari zdieľanie do webových appiek nepodporuje. Použi v Instagrame „Kopírovať odkaz“ a tu tlačidlo Vložiť.
        </p>
      </section>
    </div>
  );
}
