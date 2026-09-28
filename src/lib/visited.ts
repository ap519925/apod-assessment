import { useSyncExternalStore } from "react";

// Viewed APODs live in localStorage so the highlight survives a refresh.
// It's a tiny external store read through useSyncExternalStore, which keeps
// every card in sync (including across tabs) without a context provider.

const STORAGE_KEY = "apod:visited";
const EMPTY: string[] = [];

const listeners = new Set<() => void>();

// useSyncExternalStore needs the same array back until something changes,
// so only re-parse when the raw string is different.
let lastRaw: string | null = null;
let lastValue: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage can be blocked (private mode, strict settings) - just treat it as empty
  }

  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? JSON.parse(raw) : EMPTY;
    } catch {
      lastValue = EMPTY;
    }
  }
  return lastValue;
}

function write(dates: string[]) {
  try {
    if (dates.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing useful to do if it fails
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);

  // the storage event only fires in *other* tabs, which is what we want here
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) fn();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function markVisited(date: string) {
  const current = read();
  if (!current.includes(date)) write([...current, date]);
}

export function clearVisited() {
  write([]);
}

// Server snapshot is empty: the page is prerendered, so highlights get applied
// right after hydration instead of causing a mismatch.
export function useVisited() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
