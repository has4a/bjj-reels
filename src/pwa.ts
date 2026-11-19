import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;
const listeners = new Set<Listener>();
let update: ((reload?: boolean) => Promise<void>) | null = null;
let pending = false;

/** Service worker len v produkčnom builde (offline + inštalácia). */
export function initPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      listeners.forEach((l) => l());
    },
  });
}

export const updatePending = () => pending;

export function onUpdateAvailable(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function applyUpdate() {
  void update?.(true);
}
