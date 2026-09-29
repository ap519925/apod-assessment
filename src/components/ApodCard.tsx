"use client";

// Client Component solely for reactive visited highlighting via useVisited().
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
      <div className="relative aspect-[4/3] bg-slate-800">
        {image ? (
          // Plain <img>: Next image optimization requires a Node server (disabled in static export).
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
