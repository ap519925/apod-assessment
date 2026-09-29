"use client";

// Marked as a Client Component because it subscribes to the useVisited() hook
// to check if this specific card was already opened by the user.
// The rest of the page (Gallery, headers, pagination) remains a Server Component.

import Link from "next/link";
import { type Apod, formatDate, previewImage } from "@/lib/apod";
import { useVisited } from "@/lib/visited";

export default function ApodCard({ apod }: { apod: Apod }) {
  const visited = useVisited().includes(apod.date);
  const image = previewImage(apod);

  return (
    <Link
      href={`/apod/${apod.date}`}
      className={`group flex flex-col overflow-hidden rounded-xl border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
        visited
          ? "border-amber-400/60 bg-amber-950/40 hover:border-amber-300"
          : "border-slate-800 bg-slate-900 hover:border-slate-600"
      }`}
    >
      {/* Fixed 4:3 aspect container so grid cards stay uniform regardless of original image dimensions */}
      <div className="relative aspect-[4/3] bg-slate-800">
        {image ? (
          // Using standard <img> here because:
          // 1. Next.js image optimization requires a Node.js server, which doesn't exist in a static export (SSG).
          // 2. APOD images originate from arbitrary external CDNs, which would require an ever-growing remotePatterns list.
          // Native loading="lazy" handles offscreen performance cleanly.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={apod.title}
            loading="lazy"
            className={`h-full w-full object-cover transition group-hover:scale-105 ${
              visited ? "opacity-75" : ""
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No preview available
          </div>
        )}

        {apod.media_type === "video" && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
            Video
          </span>
        )}
        {visited && (
          <span className="absolute right-2 top-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
            Viewed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <time dateTime={apod.date} className="text-xs uppercase tracking-wide text-slate-400">
          {formatDate(apod.date)}
        </time>
        <h2 className={`font-semibold leading-snug ${visited ? "text-amber-200" : "text-slate-100"}`}>
          {apod.title}
        </h2>
      </div>
    </Link>
  );
}
