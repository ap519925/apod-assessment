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

// Static export means every page has to exist at build time, so the archive
// is a fixed window: this many pages of nine, newest first.
const PAGE_COUNT = 12;
const ARCHIVE_SIZE = PAGE_SIZE * PAGE_COUNT;

// APOD skips a day now and then, so ask for a wider window than we need
// and just keep the newest ones.
const LOOKBACK_DAYS = ARCHIVE_SIZE + 14;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Runs at build time only (static export), so the key never reaches the browser.
// Every page in the build needs the same data, so hold on to the promise and
// make a single request instead of one per page.
let archive: Promise<Apod[]> | undefined;

export function getArchive() {
  archive ??= fetchArchive();
  return archive;
}

async function fetchArchive(): Promise<Apod[]> {
  const params = new URLSearchParams({
    api_key: process.env.NASA_API_KEY || "DEMO_KEY",
    start_date: isoDaysAgo(LOOKBACK_DAYS),
    thumbs: "true",
  });

  // force-cache also shares the response across Next's build workers
  const res = await fetch(`${API_URL}?${params}`, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`APOD request failed: ${res.status} ${await res.text()}`);
  }

  const items: Apod[] = await res.json();

  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ARCHIVE_SIZE);
}

// Pages are 1-based. Returns undefined for a page past the end of the archive.
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

// Page 1 is the home page, the rest live under /page/N.
export function pageHref(page: number) {
  return page === 1 ? "/" : `/page/${page}`;
}

// Best image to use for a card or preview, if there is one.
export function previewImage(apod: Apod) {
  if (apod.media_type === "image") return apod.url;
  return apod.thumbnail_url;
}

// Dates come back as plain YYYY-MM-DD. Formatting in UTC keeps them from
// shifting a day depending on the viewer's timezone.
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
