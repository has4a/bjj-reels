import { useState } from 'react';
import { formatDate } from '../lib/text';
import { useStore } from '../state/store';
import { KIND_LABEL, type Reel } from '../types';
import { IconExternal, IconPlay, IconStar, IconStarFilled } from '../ui/icons';
import { ReelVideo, hasVideo } from './ReelVideo';

/** Hlavička reelu: autor, video (Instagram embed), IG kolekcie, popis a odkaz na Instagram. */
export function ReelSummary({ reel, video }: { reel: Reel; video?: boolean }) {
  const { update } = useStore();
  const [expanded, setExpanded] = useState(false);
  const showVideo = !!video && hasVideo(reel);
  const text = [reel.title, reel.caption].filter(Boolean).join('\n\n');
  const lines = showVideo ? 3 : 6;
  const long = text.length > (showVideo ? 160 : 280) || text.split('\n').length > lines;

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

      {showVideo && <ReelVideo key={reel.id} reel={reel} />}

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
        <div className={`caption-full${long && !expanded ? ` clamped l${lines}` : ''}`}>
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

      {showVideo ? (
        <a className="btn block open-ig" href={reel.url} target="_blank" rel="noopener noreferrer">
          <IconExternal size={17} /> Otvoriť na Instagrame
        </a>
      ) : (
        <a className="btn primary lg block open-ig" href={reel.url} target="_blank" rel="noopener noreferrer">
          <IconPlay size={18} /> Otvoriť na Instagrame
        </a>
      )}
    </div>
  );
}
