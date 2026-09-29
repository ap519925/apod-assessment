import { useSyncExternalStore } from "react";

// External localStorage store: avoids Context boilerplate, prevents hydration
// mismatches, and keeps open tabs in sync without extra dependencies.
const STORAGE_KEY = "apod:visited";
const EMPTY: string[] = [];

const listeners = new Set<() => void>();

// Caches parsed array; useSyncExternalStore requires referential stability (Object.is)
// to avoid infinite re-render loops on getSnapshot.
let lastRaw: string | null = null;
let lastValue: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Fallback if storage is blocked (e.g. Safari private mode)
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
    // Quota exceeded or disabled
  }
  listeners.forEach((fn) => fn());
}

// Subscribes component listeners; window "storage" event syncs changes across OTHER tabs.
function subscribe(fn: () => void) {
  listeners.add(fn);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) fn();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

// Idempotently records a visit
export function markVisited(date: string) {
  const current = read();
  if (!current.includes(date)) write([...current, date]);
}

// Resets history across all tabs
export function clearVisited() {
  write([]);
}

// Server snapshot returns EMPTY so static prerendering hydrates without mismatch warnings.
export function useVisited() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

