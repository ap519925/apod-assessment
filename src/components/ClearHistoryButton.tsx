"use client";

// Client Component to reset viewed history in localStorage.
// Reads the current count from useVisited() so the button label updates reactively
// (e.g. "Clear history (4)") and disables itself when there's nothing to clear.

import { clearVisited, useVisited } from "@/lib/visited";

export default function ClearHistoryButton() {
  const count = useVisited().length;

  return (
    <button
      type="button"
      onClick={clearVisited}
      disabled={count === 0}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Clear history{count > 0 && ` (${count})`}
    </button>
  );
}
