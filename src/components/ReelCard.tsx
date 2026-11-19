import { memo } from 'react';
import { isUnsorted } from '../lib/filters';
import { formatDate } from '../lib/text';
import { GI_LABEL, KIND_LABEL, LEVEL_LABEL, STATUS_LABEL, type Reel } from '../types';
import { Belt } from '../ui/controls';
import { IconExternal, IconPencilLine, IconStar, IconStarFilled } from '../ui/icons';
import { ReelVideo, hasVideo } from './ReelVideo';

interface Props {
  reel: Reel;
  video: boolean;
  onEdit: (id: string) => void;
  onAuthor: (author: string) => void;
  onFavorite: (id: string) => void;
}

export const ReelCard = memo(function ReelCard({ reel, video, onEdit, onAuthor, onFavorite }: Props) {
  const text = reel.title || reel.caption;
  const attrs = [reel.gi && GI_LABEL[reel.gi], reel.level && LEVEL_LABEL[reel.level]].filter(Boolean).join(' · ');
  const unsorted = isUnsorted(reel);
  const withVideo = video && hasVideo(reel);
  return (
    <article className={`card st-${reel.status}${reel.hidden ? ' is-hidden' : ''}${withVideo ? ' with-video' : ''}`}>
      <header className="card-head">
        {reel.author ? (
          <button type="button" className="author" onClick={() => onAuthor(reel.author!)} title={`Všetko od @${reel.author}`}>
            @{reel.author}
          </button>
        ) : (
          <span className="author faint">bez autora</span>
        )}
        <time className="num">{formatDate(reel.savedAt ?? reel.addedAt)}</time>
        <span className="kind">{KIND_LABEL[reel.kind]}</span>
        <button
          type="button"
          className={`star-btn${reel.favorite ? ' on' : ''}`}
          aria-pressed={reel.favorite}
          aria-label={reel.favorite ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}
          onClick={() => onFavorite(reel.id)}
        >
          {reel.favorite ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </button>
      </header>

      {withVideo && <ReelVideo reel={reel} lazy />}

      <a className="card-body" href={reel.url} target="_blank" rel="noopener noreferrer">
        <p className={`caption${text ? '' : ' faint'}`}>{text || 'Bez popisu'}</p>
        <span className="open">
          Otvoriť na Instagrame <IconExternal size={13} />
        </span>
      </a>

      {(reel.positions.length > 0 || reel.types.length > 0 || reel.tags.length > 0) && (
        <div className="card-tags">
          {reel.positions.map((p) => (
            <span key={'p' + p} className="pill pos">
              {p}
            </span>
          ))}
          {reel.types.map((t) => (
            <span key={'t' + t} className="pill type">
              {t}
            </span>
          ))}
          {reel.tags.map((t) => (
            <span key={'g' + t} className="pill tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <footer className="card-foot">
        <span className="status">
          <Belt status={reel.status} />
          {STATUS_LABEL[reel.status]}
        </span>
        {attrs && <span className="attrs">{attrs}</span>}
        {unsorted && !reel.hidden && <span className="flag">netriedené</span>}
        {reel.hidden && <span className="flag">mimo BJJ</span>}
        <button type="button" className="btn sm" onClick={() => onEdit(reel.id)}>
          <IconPencilLine size={16} /> Triediť
        </button>
      </footer>
    </article>
  );
});
