import type { Apod } from "@/lib/apod";

// NASA APOD entries return one of three media types:
// 1. "image": Standard photos or digital renderings (by far the most common).
// 2. "video": Usually a YouTube or Vimeo embed URL (e.g. rocket launch footage).
// 3. "other": Interactive widgets, Flash archives, or complex non-embeddable formats.
export default function ApodMedia({ apod }: { apod: Apod }) {
  // Case 1: Image - Render main image and link to high-res (hdurl) if available
  if (apod.media_type === "image" && apod.url) {
    return (
      <a href={apod.hdurl ?? apod.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={apod.url}
          alt={apod.title}
          className="mx-auto max-h-[75vh] w-auto rounded-xl"
        />
        {apod.hdurl && (
          <span className="mt-2 block text-center text-sm text-slate-400">
            Click the image to open the full resolution version
          </span>
        )}
      </a>
    );
  }

  // Case 2: Video - Render in a responsive 16:9 iframe container
  if (apod.media_type === "video" && apod.url) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={apod.url}
          title={apod.title}
          allow="fullscreen; picture-in-picture"
          className="h-full w-full"
        />
      </div>
    );
  }

  // Case 3: "Other" or unhandled format - Link to the official NASA APOD archive page.
  // NASA APOD permalinks follow the format: apYYMMDD.html (e.g. 2026-09-29 -> ap260929.html).
  return (
    <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">
      This one can&apos;t be displayed here.{" "}
      <a
        href={`https://apod.nasa.gov/apod/ap${apod.date.slice(2).replaceAll("-", "")}.html`}
        className="text-sky-400 underline"
      >
        View it on the APOD site
      </a>
      .
    </div>
  );
}
