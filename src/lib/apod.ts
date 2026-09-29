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

// 3x3 layout = 9 items per page
export const PAGE_SIZE = 9;

// In a static export (SSG), every page must be built ahead of time.
// We prerender 12 pages of 9 cards (108 pictures total), which covers roughly 3.5 months.
const PAGE_COUNT = 12;
const ARCHIVE_SIZE = PAGE_SIZE * PAGE_COUNT;

// NASA occasionally skips days (e.g. holidays or feed outages).
// We request an extra 14-day buffer so that after filtering out any gaps,
// we're guaranteed a full 108 pictures.
const LOOKBACK_DAYS = ARCHIVE_SIZE + 14;

// Helper to compute a ISO date string YYYY-MM-DD in UTC.
function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// In-memory promise cache:
// During `next build`, Next.js prerenders dozens of pages concurrently.
// By holding on to the in-flight Promise, all route workers share this single
// API request instead of making 100+ duplicate requests and burning through rate limits.
let archive: Promise<Apod[]> | undefined;

export function getArchive() {
  archive ??= fetchArchive();
  return archive;
}

async function fetchArchive(): Promise<Apod[]> {
  const params = new URLSearchParams({
    // NASA provides a shared "DEMO_KEY" with low rate limits; a personal key is set via env var
    api_key: process.env.NASA_API_KEY || "DEMO_KEY",
    start_date: isoDaysAgo(LOOKBACK_DAYS),
    // thumbs=true asks NASA to generate video thumbnails (YouTube/Vimeo) so cards don't show empty boxes
    thumbs: "true",
  });

  // cache: "force-cache" allows Next.js build workers to share the cached response across worker processes
  const res = await fetch(`${API_URL}?${params}`, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`APOD request failed: ${res.status} ${await res.text()}`);
  }

  const items: Apod[] = await res.json();

  // NASA returns dates ascending (oldest first). Sort descending (newest first)
  // and slice down to our exact target window of 108 entries.
  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ARCHIVE_SIZE);
}

// Retrieves pictures for a specific 1-indexed page.
// Returns undefined if the requested page is out of bounds.
export async function getPage(page: number) {
  const apods = await getArchive();
  const totalPages = Math.ceil(apods.length / PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1 || page > totalPages) return undefined;

  const start = (page - 1) * PAGE_SIZE;
  return { apods: apods.slice(start, start + PAGE_SIZE), page, totalPages };
}

// Looks up a single APOD by date string (e.g. "2026-09-29") for the detail view
export async function getApod(date: string) {
  const apods = await getArchive();
  return apods.find((a) => a.date === date);
}

// Route mapping: Page 1 is the canonical root "/", while pages 2+ live at "/page/[page]".
export function pageHref(page: number) {
  return page === 1 ? "/" : `/page/${page}`;
}

// Returns the best preview image URL for a card.
// Standard images use .url; videos use .thumbnail_url (from thumbs=true).
export function previewImage(apod: Apod) {
  if (apod.media_type === "image") return apod.url;
  return apod.thumbnail_url;
}

// Dates from the API are YYYY-MM-DD strings.
// Appending T00:00:00Z and specifying timeZone: "UTC" is critical:
// without this, a user in US West Coast (UTC-8) would see the date roll back by 1 day!
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

