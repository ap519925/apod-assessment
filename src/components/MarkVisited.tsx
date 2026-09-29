"use client";

import { useEffect } from "react";
import { markVisited } from "@/lib/visited";

// Headless / Renderless Client Component:
// Detail pages (/apod/[date]) are Server Components that fetch data and prerender HTML.
// Instead of converting the whole page into a Client Component (which would increase client JS
// bundle size and lose server rendering benefits), we drop this lightweight component into
// the page. Its only purpose is to trigger markVisited(date) in a client-side useEffect on mount.
export default function MarkVisited({ date }: { date: string }) {
  useEffect(() => {
    markVisited(date);
  }, [date]);

  return null;
}
