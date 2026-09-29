"use client";

// Client Component: reactively reads useVisited() count and clears localStorage.

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
