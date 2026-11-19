import { useEffect, useState } from 'react';

export type Route =
  | { name: 'list' }
  | { name: 'sort' }
  | { name: 'add' }
  | { name: 'settings' }
  | { name: 'reel'; id: string };

export function parseHash(hash: string): Route {
  const s = hash.replace(/^#\/?/, '');
  if (s.startsWith('reel/')) return { name: 'reel', id: decodeURIComponent(s.slice(5)) };
  if (s === 'sort' || s === 'add' || s === 'settings') return { name: s };
  return { name: 'list' };
}

export const reelPath = (id: string) => 'reel/' + encodeURIComponent(id);

/**
 * Hash routing (funguje na statickom hostingu z ľubovoľnej podcesty).
 * replace=true pre prepínanie záložiek, push pre otvorenie detailu (tlačidlo Späť ho zavrie).
 */
export function navigate(path: string, replace = false) {
  const url = '#/' + path;
  if (url === location.hash || (path === '' && (location.hash === '' || location.hash === '#/'))) return;
  if (replace) history.replaceState(history.state, '', url);
  else history.pushState({ inApp: true }, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Späť v rámci appky; ak sme prišli zvonka (napr. zo zdieľania), choď na fallback. */
export function goBack(fallback = '') {
  if ((history.state as { inApp?: boolean } | null)?.inApp) history.back();
  else navigate(fallback, true);
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const h = () => setHash(location.hash);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return parseHash(hash);
}
