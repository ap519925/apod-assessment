# APOD Explorer

A modern Next.js + TypeScript + Tailwind CSS application built for the Stanford Web Services take-home assessment, styled with custom Google Fonts (**Exo 2** for sci-fi headings and **Geist Sans** for readable prose) on a deep-space dark palette.

The app displays entries from NASA's [Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html) API in a responsive 3x3 grid, newest first, with Newer/Older pagination spanning a 108-picture archive (~3.5 months). Clicking any card opens a prerendered detail page; previously opened pictures are visually highlighted with a distinct border and "Viewed" badge, and a reactive "Clear history" button resets stored visits across all open tabs.

**Live site:** [https://apod-explorer.wasmer.app](https://apod-explorer.wasmer.app)

---

## Running Locally

Requires **Node.js 20+**.

```bash
npm install
npm run dev          # http://localhost:3000
```

The application works out of the box with NASA's shared `DEMO_KEY`. To avoid NASA's shared hourly rate limits, you can provide a free key from [api.nasa.gov](https://api.nasa.gov/):

```bash
# .env.local
NASA_API_KEY=your_key_here
```

To build and serve the production static export locally:

```bash
npm run build        # compiles static HTML/CSS/JS into ./out
npm start            # serves ./out locally on http://localhost:3000
```

---

## Deploying to Wasmer Edge

The app is compiled to a static export (`output: "export"` in `next.config.ts`), deployed on **Wasmer Edge**, and served with [`static-web-server`](https://wasmer.io/wasmer/static-web-server). Configuration is defined in `wasmer.toml`, `settings/config.toml`, and `app.yaml`.

```bash
npm run build
wasmer run . --net   # optional: test the Wasmer package locally on http://localhost
wasmer deploy        # deploys to Wasmer Edge (app config is in app.yaml)
```

### Automated Daily Updates
Because the site is a static export, content updates occur at build time. To keep the archive current with NASA's daily releases, [.github/workflows/deploy.yml](.github/workflows/deploy.yml) automatically runs once daily at **06:00 UTC** (shortly after NASA publishes each day's picture).

To activate automated deploys:
1. Generate an access token on Wasmer: [wasmer.io/settings/access-tokens](https://wasmer.io/settings/access-tokens).
2. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
3. Add a repository secret named `WASMER_TOKEN` with your Wasmer token.
4. *(Optional)* Add `NASA_API_KEY` to avoid NASA demo key rate limits.

---

## Project Structure

```
src/
  app/
    layout.tsx            Root layout (HTML shell, font definitions, dark theme)
    globals.css           Tailwind v4 theme tokens and global heading styles
    page.tsx              Home route ("/") - renders page 1 of the grid
    page/[page]/page.tsx  Archive pages ("/page/2" through "/page/12")
    apod/[date]/page.tsx  Detail page (108 prerendered routes, one per date)
    not-found.tsx         Custom 404 page for invalid dates or out-of-bound pages
  components/
    ApodCard.tsx          Grid card with reactive visited highlight (Client Component)
    ApodMedia.tsx         Polymorphic media presenter (Image / Video / Fallback)
    Gallery.tsx           Responsive 3x3 grid container with header and pagination
    Pagination.tsx        Newer / Older navigation links
    ClearHistoryButton.tsx Button with live visited count (Client Component)
    MarkVisited.tsx       Headless effect runner to record visits (Client Component)
  lib/
    apod.ts               API client, TypeScript types, promise caching, pagination math
    visited.ts            Zero-dependency external store backed by localStorage
```

---

## Technical Discussion & Architecture Decisions

### 1. Component Development
- **Server vs. Client Boundaries:** Pages (`page.tsx`, `[page]/page.tsx`, `[date]/page.tsx`) and layout containers (`Gallery.tsx`) are React Server Components (RSC) that render static HTML with zero client JS. Client components (`"use client"`) are pushed strictly to interactive leaves:
  - `ApodCard.tsx`: Subscribes to `useVisited()` for visual highlighting and "Viewed" badge.
  - `ClearHistoryButton.tsx`: Handles click events and reactive count display.
  - `MarkVisited.tsx`: Headless client component (`return null`) that runs a client `useEffect` on mount to record visits without converting the detail page into a client bundle.
- **Modularity:** `ApodMedia.tsx` isolates polymorphic media rendering (images with high-res links, 16:9 video embeds, and non-embeddable archive fallbacks).
- **Design System:** Tailwind CSS v4 `@theme inline` with **Exo 2** headings and **Geist Sans** body on a dark space palette.

### 2. State Management
- **The Problem:** Track and persist visited cards across reloads and open tabs without SSR hydration mismatches in a static export.
- **Why `useSyncExternalStore` (`src/lib/visited.ts`):**
  - **Zero Boilerplate:** Avoids wrapping the tree in a `<Context.Provider>`.
  - **Selective Re-renders:** Only components calling `useVisited()` re-render on updates.
  - **Hydration Safety:** The 3rd parameter (`getServerSnapshot: () => EMPTY`) renders a clean server baseline matching static HTML, avoiding hydration errors.
  - **Referential Stability:** Caches the parsed array (`lastRaw` / `lastValue`) so `read()` returns the same reference unless `localStorage` changes, preventing infinite re-render loops from `Object.is()`.
  - **Multi-Tab Sync:** Automatically syncs across separate tabs via `window.addEventListener("storage", ...)`.

### 3. API Creation and Consumption
- **API Consumption (`src/lib/apod.ts`):**
  - **Promise Caching:** Memoizes `archive ??= fetchArchive()` so all 123 static route workers share a single NASA API call during build.
  - **Lookback Buffer:** Requests 14 extra buffer days (`LOOKBACK_DAYS = 122`) to guarantee a full 108-item archive despite occasional NASA feed outages.
  - **Timezone Normalization:** Formats `YYYY-MM-DD` explicitly in UTC (`timeZone: "UTC"`) to prevent western timezones from shifting dates backward by 1 day.
  - **Video Thumbnails:** Queries with `thumbs: "true"` so YouTube/Vimeo entries have preview images.
- **Data Contracts:** Abstracted behind strict TypeScript interfaces (`Apod`) and pure helper functions (`getPage()`, `getApod()`, `pageHref()`, `previewImage()`).

### 4. Rendering Approaches: CSR vs. SSR vs. ISR vs. SSG
- **Comparison:**
  - **CSR:** Fast hosting, but poor SEO, delayed initial paint, and exposes API keys to the browser.
  - **SSR:** Always fresh, but adds latency to every page view and requires a 24/7 Node server for data that only changes once daily.
  - **ISR:** Static speed with background revalidation, but requires a Node runtime (cannot run on pure static edge servers).
  - **SSG (Chosen):** Pre-compiled to static HTML/CSS at build time via `output: "export"`. Instantaneous TTFB, host-agnostic, zero secrets in the client bundle, and zero server maintenance.
- **Proof of Approach:**
  - Matches NASA's once-a-day release cadence without redundant server computations.
  - Runs natively on Wasmer Edge via `static-web-server`.
  - Solves the static freshness trade-off via a GitHub Actions workflow (`.github/workflows/deploy.yml`) that rebuilds and deploys daily at `06:00 UTC`.

---

## Future Improvements

- **Comprehensive Test Suite:** Implement unit and integration tests using Vitest and React Testing Library for `visited.ts` (storage events, snapshot caching) and `apod.ts` (date math and array pagination).
- **Keyboard Navigation:** Add left/right arrow key shortcuts on detail pages to navigate sequentially through the archive.
- **Client-Side Search:** Add client-side text filtering by title or keywords across the 108 cached entries.
