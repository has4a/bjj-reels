import { useEffect, useRef, useState } from 'react';
import { codeOf, embedUrl } from '../lib/url';
import type { Reel } from '../types';

/** namerané výšky embedov (v rámci relácie), aby zoznam pri návrate neposkakoval */
const measured = new Map<string, number>();

export const hasVideo = (reel: Reel) => !!embedUrl(reel.kind, codeOf(reel.id, reel.kind));

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/**
 * Video cez oficiálny Instagram embed (iframe) – nič sa nesťahuje ani nescrapuje.
 * Reels s pôvodným zvukom sa prehrajú priamo tu; pri licencovanej hudbe Instagram ponúkne „Watch on Instagram“.
 * lazy: iframe sa vytvorí až pri priblížení k obrazovke a zruší sa, keď je ďaleko (šetrí pamäť v dlhom zozname).
 */
export function ReelVideo({ reel, lazy = false }: { reel: Reel; lazy?: boolean }) {
  const src = embedUrl(reel.kind, codeOf(reel.id, reel.kind));
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(!lazy);
  const [height, setHeight] = useState(() => measured.get(reel.id));
  const online = useOnline();

  useEffect(() => {
    if (!lazy) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [lazy]);

  // embed posiela svoju výšku: {"type":"MEASURE","details":{"height":639}}
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.instagram.com' || !frame.current || e.source !== frame.current.contentWindow) return;
      let data: unknown = e.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      const msg = data as { type?: string; details?: { height?: unknown } } | null;
      const h = msg?.type === 'MEASURE' ? msg.details?.height : undefined;
      if (typeof h === 'number' && h > 0) {
        const px = Math.ceil(h);
        measured.set(reel.id, px);
        setHeight(px);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [reel.id]);

  if (!src) return null;

  return (
    <div ref={box} className="video" style={height ? { height } : undefined} data-h={height ? '' : undefined}>
      {!online ? (
        <div className="video-msg">Video sa načíta, keď budeš online.</div>
      ) : near ? (
        <iframe
          ref={frame}
          src={src}
          title={`Video od ${reel.author ? '@' + reel.author : 'autora'}`}
          loading="lazy"
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      ) : null}
    </div>
  );
}
