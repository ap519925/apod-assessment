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

#### Server vs. Client Component Boundaries
In the Next.js App Router, components default to **React Server Components (RSC)**. This architecture keeps data fetching and layout rendering entirely on the server, sending zero runtime JavaScript to the client for the page shell:
- **Server Components:** `page.tsx`, `page/[page]/page.tsx`, `apod/[date]/page.tsx`, and `Gallery.tsx` are pure Server Components. They fetch data at build time and render semantic, accessible HTML.
- **Client Components (`"use client"`):** Client boundaries are strictly pushed to the leaf components that require browser APIs or interactive state:
  - `ApodCard.tsx`: Reads the `useVisited()` hook to highlight viewed cards and render the "Viewed" badge.
  - `ClearHistoryButton.tsx`: Handles click events and reactively displays the count of viewed items (`Clear history (4)`).
  - `MarkVisited.tsx`: Implements the **Headless / Renderless Client Component pattern**. Placed on detail pages, it returns `null` and exists solely to trigger a client-side `useEffect` on mount that marks the current date as viewed. This keeps the parent detail page a 100% Server Component rather than forcing the entire route into a heavy client bundle.

#### Component Decomposition & Modularity
- **`ApodMedia.tsx`:** Isolates polymorphic media rendering. NASA APOD entries can be standard images, YouTube/Vimeo video embeds, or non-embeddable interactive formats. Decoupling this into its own presenter keeps the detail page clean and easy to test.
- **`Gallery.tsx` & `Pagination.tsx`:** The grid layout, header date summary, and pagination controls are shared between page 1 (`/`) and paginated routes (`/page/[page]`), adhering to DRY principles.
- **Design System & Typography:** Built with Tailwind CSS v4 using modern `@theme inline` variables. Headings are styled with Google Fonts **Exo 2** for an astronomy/sci-fi aesthetic, while **Geist Sans** is used for readable body copy.

---

### 2. State Management

#### The Problem
The application requires tracking which APOD entries a user has visited, persisting that state across browser reloads, and synchronizing across multiple open tabs—all while running within a static export where server-side user sessions do not exist.

#### Why `useSyncExternalStore` Over Context / useState / Redux
Rather than introducing heavy third-party state libraries (Zustand, Redux) or wrapping the entire application in a React Context Provider, the app implements a tiny external store in `src/lib/visited.ts` powered by React 18+'s native `useSyncExternalStore`:

1. **Zero Provider Boilerplate:** No `<VisitedProvider>` is required at the root layout. Any component can consume `useVisited()` directly.
2. **Selective Re-rendering:** Only components subscribed to `useVisited()` re-render when state changes. Server Components and unaffected cards remain untouched.
3. **Hydration Safety (No SSR Mismatch):** When prerendering static HTML, `localStorage` does not exist on the server. `useSyncExternalStore` accepts a third argument, `getServerSnapshot: () => EMPTY`. This ensures the server HTML renders a clean baseline (unhighlighted cards) and hydrates on the client without throwing React hydration mismatch warnings.
4. **Referential Stability (`Object.is`):** `useSyncExternalStore` checks snapshot equality with `Object.is()`. If `read()` called `JSON.parse()` on every render, it would return a new array memory reference each time and cause an infinite re-render loop. `visited.ts` caches the parsed array (`lastRaw` / `lastValue`) so it only re-parses when the raw `localStorage` string actually changes.
5. **Cross-Tab Synchronization:** Same-tab updates notify active listeners via an internal `Set<() => void>`. To keep separate open browser tabs in sync, the store listens to the window `"storage"` event (`window.addEventListener("storage", ...)`), instantly reflecting changes across all tabs when a user marks or clears history.

---

### 3. API Creation and Consumption

#### API Consumption (`src/lib/apod.ts`)
The application consumes NASA's Astronomy Picture of the Day API (`https://api.nasa.gov/planetary/apod`):
- **In-Memory Promise Caching:** Next.js builds routes in parallel across multiple worker processes. By storing the in-flight Promise (`archive ??= fetchArchive()`), all 123 static route workers share a single network call rather than making 100+ redundant HTTP requests that would exhaust NASA API rate limits.
- **Buffer Lookback for Missing Dates:** NASA APOD occasionally skips dates due to feed outages or service disruptions. To guarantee a full 108-item archive (12 pages of 9), the client requests an extra 14-day lookback buffer (`LOOKBACK_DAYS = 122`) and trims to the exact newest 108 items after sorting descending.
- **Timezone Normalization:** NASA dates are returned as `YYYY-MM-DD`. Parsing these without an explicit timezone can cause dates to roll back by one day for users in western timezones (e.g. UTC-8). Appending `T00:00:00Z` and formatting with `timeZone: "UTC"` ensures identical, accurate date rendering for all users worldwide.
- **Video Thumbnail Extraction:** Passing `thumbs: "true"` to the NASA API instructs it to generate thumbnail preview images for video entries (YouTube/Vimeo), ensuring grid cards always have a visual preview.

#### API Creation & Data Contracts
The data layer is abstracted behind strict TypeScript interfaces:
- **`Apod` Type:** Strongly types the API response contract (`date`, `title`, `explanation`, `media_type`, `url`, `hdurl`, `thumbnail_url`, `copyright`).
- **Data Access Helpers:** Pure helper functions (`getPage(page)`, `getApod(date)`, `pageHref(page)`, `previewImage(apod)`) encapsulate data manipulation, decoupling the external API schema from the UI layer. In a full-stack Next.js deployment, this same data layer could back a dedicated Route Handler (`/api/apod`) or Server Action.

---

### 4. Rendering Approaches: CSR vs. SSR vs. ISR vs. SSG

| Approach | Rendering Location & Timing | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Client-Side Rendering (CSR)** | Browser renders HTML after downloading JS shell and fetching API client-side | Simplest hosting; dynamic user-specific views | Poor SEO; slower First Contentful Paint (FCP); exposes API keys to client or requires proxy |
| **Server-Side Rendering (SSR)** | Node.js server generates full HTML on every incoming request | Always fresh data; personalized content per request | High TTFB latency (waits on NASA API every request); server overhead; requires 24/7 Node server |
| **Incremental Static Regeneration (ISR)** | Prerendered at build time; regenerated in background after timeout (`revalidate`) | Static speed with automated freshness without full rebuilds | Requires running Node.js server runtime (e.g. Vercel or Node/Docker); not portable to static hosts |
| **Static Site Generation (SSG - Chosen)** | Pre-compiled to static HTML/CSS/JS at build time (`output: "export"`) | Instantaneous TTFB; zero server maintenance; host-agnostic; maximum security | Data freshness requires a rebuild/redeploy |

#### Proof of Approach & Why SSG Was Chosen Over the Others
This project implements **Static Site Generation (SSG)** via Next.js `output: "export"`. Here is why this was selected over CSR, SSR, and ISR:

1. **Alignment with Content Cadence:** NASA publishes APOD content exactly **once per day**. Using SSR to execute a NASA API request on every page view is inefficient and risks hitting rate limits for data that does not change between requests.
2. **Infrastructure Independence (Wasmer Edge):** The target platform is **Wasmer Edge** running `static-web-server`. A static export produces pure pre-rendered HTML files (`/index.html`, `/page/2/index.html`, `/apod/2026-09-29/index.html`), making the application completely host-agnostic—it can be served from Wasmer Edge, Cloudflare Pages, S3/CloudFront, or any standard web server without a running Node.js runtime.
3. **Security & Zero Secrets in Client Bundle:** NASA API keys are only consumed during the build step on the build machine. No API keys or sensitive environment variables are ever included in the client JavaScript bundle.
4. **Solving the Freshness Trade-off with GitHub Actions:** The traditional drawback of SSG is that new content requires a rebuild. We solved this by pairing the static export with a scheduled GitHub Actions workflow (`.github/workflows/deploy.yml`) configured to run daily at `06:00 UTC`. The workflow automatically fetches today's new APOD, compiles the 123 static pages, and deploys the bundle to Wasmer Edge.

---

## Future Improvements

- **Comprehensive Test Suite:** Implement unit and integration tests using Vitest and React Testing Library for `visited.ts` (storage events, snapshot caching) and `apod.ts` (date math and array pagination).
- **Keyboard Navigation:** Add left/right arrow key shortcuts on detail pages to navigate sequentially through the archive.
- **Client-Side Search:** Add client-side text filtering by title or keywords across the 108 cached entries.
