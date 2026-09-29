import { useSyncExternalStore } from "react";

// Visited state is stored in localStorage so opened cards stay highlighted
// across browser refreshes and sessions.
//
// Why useSyncExternalStore instead of React Context / useState:
// 1. No Context Provider needed at the root of the component tree.
// 2. Only components that call useVisited() re-render when state changes.
// 3. Built-in support for a server snapshot (prevents hydration mismatch).
// 4. Easy to synchronize across browser tabs via the window "storage" event.

const STORAGE_KEY = "apod:visited";
const EMPTY: string[] = [];

// Set of active subscriber callbacks (one per mounted component using the hook)
const listeners = new Set<() => void>();

// CRITICAL: useSyncExternalStore uses Object.is() on the value returned by getSnapshot.
// If read() called JSON.parse() and returned a fresh array reference on every tick,
// React would think the store changed and trigger an infinite re-render loop.
// So we cache the parsed array and only re-parse when the raw localStorage string actually changes.
let lastRaw: string | null = null;
let lastValue: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in restricted environments (e.g. Safari private mode
    // or sandboxed iframes). Fall back gracefully to empty state.
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

// Writes updated dates back to localStorage and alerts all active components in this tab.
function write(dates: string[]) {
  try {
    if (dates.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Quota exceeded or storage disabled; fail silently
  }
  listeners.forEach((fn) => fn());
}

// Subscribes components to store updates.
// Note: localStorage.setItem does NOT dispatch a "storage" event to the window
// that triggered it, so same-tab updates are handled by the listeners Set above,
// while window.addEventListener("storage") handles updates coming from OTHER open tabs.
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

// Marks a single date as visited (idempotent; won't add duplicates)
export function markVisited(date: string) {
  const current = read();
  if (!current.includes(date)) write([...current, date]);
}

// Resets history when the user clicks "Clear history"
export function clearVisited() {
  write([]);
}

// Custom hook to read visited dates.
// The third argument (() => EMPTY) is the getServerSnapshot callback:
// During static build / SSR, localStorage doesn't exist, so we return EMPTY.
// Once hydrated on the client, the hook reads real localStorage state and
// applies highlights without throwing React hydration mismatch warnings.
export function useVisited() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

