import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** Drobné nastavenia UI (filtre, zoradenie) – len v tomto prehliadači, chyby úložiska sa ignorujú. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed = JSON.parse(raw) as T;
      if (initial && typeof initial === 'object' && !Array.isArray(initial)) return { ...initial, ...parsed };
      return typeof parsed === typeof initial ? parsed : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* súkromný režim / plné úložisko – nevadí */
    }
  }, [key, value]);
  return [value, setValue];
}
