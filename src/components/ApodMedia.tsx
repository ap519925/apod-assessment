import type { Apod } from "@/lib/apod";

// Handles standard images, YouTube/Vimeo video embeds, and non-embeddable "other" entries.
export default function ApodMedia({ apod }: { apod: Apod }) {
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

  // Fallback for non-embeddable formats: permalink formula is apYYMMDD.html
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
