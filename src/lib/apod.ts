export type Apod = {
  date: string; // YYYY-MM-DD
  title: string;
  explanation: string;
  media_type: "image" | "video" | "other";
  url?: string;
  hdurl?: string;
  thumbnail_url?: string; // only present for videos when thumbs=true
  copyright?: string;
};

const API_URL = "https://api.nasa.gov/planetary/apod";
export const PAGE_SIZE = 9;

// Fixed 108-item window (12 pages x 9) for static prerendering (~3.5 months).
const PAGE_COUNT = 12;
const ARCHIVE_SIZE = PAGE_SIZE * PAGE_COUNT;

// Buffer extra days to absorb feed gaps / missing dates from NASA.
const LOOKBACK_DAYS = ARCHIVE_SIZE + 14;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// In-memory promise cache: shares 1 NASA API call across all parallel build workers.
let archive: Promise<Apod[]> | undefined;

export function getArchive() {
  archive ??= fetchArchive();
  return archive;
}

async function fetchArchive(): Promise<Apod[]> {
  const params = new URLSearchParams({
    api_key: process.env.NASA_API_KEY || "DEMO_KEY",
    start_date: isoDaysAgo(LOOKBACK_DAYS),
    thumbs: "true", // generates video thumbnails for YouTube/Vimeo
  });

  const res = await fetch(`${API_URL}?${params}`, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`APOD request failed: ${res.status} ${await res.text()}`);
  }

  const items: Apod[] = await res.json();

  // Sort newest first and trim to 108
  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ARCHIVE_SIZE);
}

// 1-indexed page lookup
export async function getPage(page: number) {
  const apods = await getArchive();
  const totalPages = Math.ceil(apods.length / PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1 || page > totalPages) return undefined;

  const start = (page - 1) * PAGE_SIZE;
  return { apods: apods.slice(start, start + PAGE_SIZE), page, totalPages };
}

export async function getApod(date: string) {
  const apods = await getArchive();
  return apods.find((a) => a.date === date);
}

// Page 1 is "/", pages 2+ are "/page/[page]"
export function pageHref(page: number) {
  return page === 1 ? "/" : `/page/${page}`;
}

// Image fallback for video cards (from thumbs=true)
export function previewImage(apod: Apod) {
  if (apod.media_type === "image") return apod.url;
  return apod.thumbnail_url;
}

// Formats in UTC so dates don't shift backward for western timezones
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

