import { useState } from 'react';
import { codeOf, embedUrl } from '../lib/url';
import { formatDate } from '../lib/text';
import { useStore } from '../state/store';
import { KIND_LABEL, type Reel } from '../types';
import { IconPlay, IconStar, IconStarFilled } from '../ui/icons';

/** Hlavička reelu: autor, dátum, IG kolekcie, popis z Instagramu a tlačidlo na otvorenie. */
export function ReelSummary({ reel, preview }: { reel: Reel; preview?: boolean }) {
  const { update } = useStore();
  const [expanded, setExpanded] = useState(false);
  const text = [reel.title, reel.caption].filter(Boolean).join('\n\n');
  const long = text.length > 280 || text.split('\n').length > 6;
  const embed = preview ? embedUrl(reel.kind, codeOf(reel.id, reel.kind)) : null;

  return (
    <div className="summary">
      <div className="summary-meta">
        <span className="author">{reel.author ? `@${reel.author}` : 'bez autora'}</span>
        {reel.authorName && reel.authorName !== reel.author && <span className="faint name">{reel.authorName}</span>}
        <span className="spacer" />
        <button
          type="button"
          className={`star-btn${reel.favorite ? ' on' : ''}`}
          aria-pressed={reel.favorite}
          aria-label={reel.favorite ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}
          onClick={() => update(reel.id, (r) => ({ favorite: !r.favorite }))}
        >
          {reel.favorite ? <IconStarFilled size={22} /> : <IconStar size={22} />}
        </button>
      </div>
      <div className="summary-sub faint num">
        {KIND_LABEL[reel.kind]} ·{' '}
        {reel.savedAt ? `uložené ${formatDate(reel.savedAt)}` : `pridané ${formatDate(reel.addedAt)}`}
        {reel.source === 'manual' && (reel.savedAt ? ' · pridané ručne' : ' ručne')}
      </div>

      {reel.igCollections.length > 0 && (
        <div className="igcols" aria-label="Kolekcie na Instagrame">
          {reel.igCollections.map((c) => (
            <span key={c} className="pill col">
              {c}
            </span>
          ))}
        </div>
      )}

      {text ? (
        <div className={`caption-full${long && !expanded ? ' clamped' : ''}`}>
          <p>{text}</p>
          {long && (
            <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Skryť' : 'Celý popis'}
            </button>
          )}
        </div>
      ) : (
        <p className="faint caption-empty">Instagram k tomuto reelu neposlal popis.</p>
      )}

      {embed && (
        <div className="embed">
          <iframe
            key={embed}
            src={embed}
            title={`Náhľad reelu od ${reel.author ?? 'autora'}`}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}

      <a className="btn primary lg block open-ig" href={reel.url} target="_blank" rel="noopener noreferrer">
        <IconPlay size={18} /> Otvoriť na Instagrame
      </a>
    </div>
  );
}
