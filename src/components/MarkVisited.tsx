"use client";

import { useEffect } from "react";
import { markVisited } from "@/lib/visited";

// Headless Client Component: runs client-side useEffect on mount to mark a visit,
// keeping the rest of the detail page a pure Server Component.
export default function MarkVisited({ date }: { date: string }) {
  useEffect(() => {
    markVisited(date);
  }, [date]);

  return null;
}
