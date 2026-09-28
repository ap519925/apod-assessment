"use client";

import { useEffect } from "react";
import { markVisited } from "@/lib/visited";

// Drop this on a detail page to record that the APOD was opened.
// Renders nothing - it only exists to run the effect on the client.
export default function MarkVisited({ date }: { date: string }) {
  useEffect(() => {
    markVisited(date);
  }, [date]);

  return null;
}
