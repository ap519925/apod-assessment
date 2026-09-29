# APOD Explorer

A Next.js + TypeScript + Tailwind CSS app built for the Stanford Web Services take-home, styled with Google Fonts (Exo 2 headings + Geist Sans body) on a space-themed dark palette. It displays entries from NASA's [Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html) API in a responsive 3x3 grid, newest first, with Newer/Older paging back through the last 108 pictures. Clicking a card opens a detail page, cards you've already opened are highlighted when you go back, and "Clear history" resets them.

**Live site:** https://apod-explorer.wasmer.app

## Running it locally

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

The app works with NASA's shared `DEMO_KEY`, but that key is heavily rate limited. A free key from [api.nasa.gov](https://api.nasa.gov/) avoids that:

```bash
# .env.local
NASA_API_KEY=your_key_here
```

To build and serve the production output:

```bash
npm run build        # writes static files to ./out
npm start            # serves ./out
```

## Deploying (Wasmer Edge)

The build is a plain static site, so it's served on Wasmer with [`static-web-server`](https://wasmer.io/wasmer/static-web-server). Config lives in `wasmer.toml` and `settings/config.toml`.

```bash
npm run build
wasmer run . --net   # optional: test the Wasmer package locally on http://localhost
wasmer deploy        # app config is in app.yaml
```

Because the content is baked in at build time, the site needs to be rebuilt and deployed to pick up new APODs. `.github/workflows/deploy.yml` does that automatically 1x per day at 06:00 UTC (and on every push to `main`, or manually from the Actions tab).

To enable automated daily deploys:
1. Generate an access token on Wasmer: [wasmer.io/settings/access-tokens](https://wasmer.io/settings/access-tokens)
2. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**
3. Add a repository secret named `WASMER_TOKEN` with your Wasmer access token
4. (Optional) Add `NASA_API_KEY` to avoid NASA demo rate limits

## Structure

```
src/
  app/
    page.tsx              home page - page 1 of the grid
    page/[page]/page.tsx  older grid pages, /page/2 onwards
    apod/[date]/page.tsx  detail page, one prerendered per date
    not-found.tsx
  components/
    ApodCard.tsx          grid card, highlights itself when visited (client)
    ApodMedia.tsx         image / video / fallback for the detail page
    Gallery.tsx           grid + header shared by the home and /page/N routes
    Pagination.tsx        Newer / Older links
    ClearHistoryButton.tsx
    MarkVisited.tsx       records a visit when a detail page mounts (client)
  lib/
    apod.ts               API types + fetching (build time only)
    visited.ts            localStorage-backed "visited" store + useVisited hook
```

**Components.** Pages are Server Components and fetch all of the data. The parts that are based in the browser are Client Components: the card (reads visited state), the clear button, and `MarkVisited`. That keeps the JS small and the API key out of the client bundle.

**State.** The visited list is the only client state. It lives in `localStorage` so it survives refreshes, and is read through `useSyncExternalStore` rather than a Context + `useState` pair. Any component can call `useVisited()` without a provider, updates from one component re-render the others, and it also syncs between open tabs via the `storage` event. The server snapshot is an empty list, so the prerendered HTML hydrates cleanly.

**API.** One request per build: `start_date` 122 days back with `thumbs=true` (so video entries get a thumbnail for the card), sorted newest first and trimmed to 12 pages of nine. APOD occasionally skips days, which is why it asks for a few extra. The result is memoized so every grid and detail page shares it.

**Paging.** A static export can only serve pages that were built, so the archive is a fixed window (`PAGE_COUNT` in `lib/apod.ts`). Each grid page and each detail page in that window is prerendered. Older/newer links on a detail page move through the whole archive, and "Back" returns to the grid page that APOD is on. Going back further than that is where ISR (build pages on first request) or a small API proxy for client-side fetching would come in.

## Rendering: why static generation

 Three options I considered:

- **Client-side rendering** - fetch from the browser after load. Simple, but the page is empty until the request finishes, it's worse for SEO, and it would expose the API key (or need a proxy).
- **Server-side rendering** - fetch on every request. Always fresh, but it needs a server running and makes a NASA API call per page view for data that changes once a day.
- **Incremental static regeneration** - prerender at build, then regenerate in the background after a set time (`export const revalidate = 3600`). This is the best fit for APOD on paper: static speed, and new pictures show up without a redeploy.

I went with **static generation (SSG) via `output: "export"`**. The data only changes once a day, so every page can be prerendered to HTML, and the output is just files that can be hosted anywhere, which is what I needed to deploy on Wasmer. The trade-off is that ISR requires a running Next.js server, which a static export doesn't have, so freshness comes from rebuilding instead. On Vercel or a Node host I'd drop `output: "export"` and add `revalidate` to the pages to switch to ISR; nothing else would need to change.

## Things I'd add with more time

- Comprehensive test suite for `visited.ts` and API sorting/trimming
- Keyboard arrow navigation on detail pages
- Client-side search or filtering by keyword / media type

## Reflection & Retrospective

### What challenges were you trying to solve?
- **Static Export with Dynamic Visited State:** The app needed to highlight opened cards and persist that history across reloads without causing React SSR hydration mismatches. Because this is a static export, the server HTML cannot know client localStorage state. Using `useSyncExternalStore` with an empty server snapshot cleanly resolved this without layout flashes or console errors.
- **Heterogeneous Media Types in NASA's Feed:** NASA APOD returns standard images, high-resolution alternatives, YouTube/Vimeo video embeds, and occasional non-standard interactive formats. The UI needed to handle all three gracefully while maintaining a uniform 3x3 grid using fixed aspect ratios and responsive iframes.
- **Rate Limits & Feed Gaps:** NASA's APOD endpoint occasionally skips days (leaving date gaps) and heavily rate-limits requests on shared keys. To solve this, the build fetches an extra 14-day lookback buffer and memoizes the in-flight fetch promise so that all 123 static route workers share a single API call.
- **Smart Context-Aware Navigation:** On detail pages, "Back" returns the viewer to the specific paginated grid page containing that picture (e.g. `/page/3`), rather than always defaulting to page 1.

### What, if any, technical limitations were you working within?
- **Static Export Hosting (Wasmer Edge):** Deploying as a static site via `output: "export"` with `static-web-server` means there is no persistent Node.js server at runtime. Features like dynamic server-side rendering (SSR), on-demand ISR revalidation, and Next.js Image Optimization API (`next/image`) are unavailable.
- **Fixed Prerender Window:** Because every page must exist as a static HTML file at build time, the archive window is fixed to 108 pictures (12 pages of 9). Daily freshness is automated via GitHub Actions rather than on-demand background regeneration.
- **Client Storage Availability:** `localStorage` can throw security exceptions in sandboxed iframes or aggressive browser privacy modes (e.g. Safari private browsing), requiring safe exception handling and fallback defaults.

### If you were collaborating with other developers how did you separate the work?
- **Clear Decoupling by Architectural Layer:**
  - **Data Layer (`src/lib/apod.ts`):** API integration, TypeScript definitions (`Apod`), pagination math, date formatting, and caching logic.
  - **Client State Layer (`src/lib/visited.ts`):** `useSyncExternalStore` implementation, localStorage persistence, and cross-tab storage event listeners.
  - **Component Library (`src/components/`):** Pure presentation components (`Gallery`, `ApodCard`, `ApodMedia`, `Pagination`, `ClearHistoryButton`) built against defined TypeScript interfaces.
  - **App Router Pages (`src/app/`):** Route-level orchestration, dynamic route segment params, metadata generation, and static parameter export.
- **TypeScript Interface Contracts:** Establishing the `Apod` type definition early allowed frontend UI development to proceed in parallel with API fetching logic without integration friction.
- **Feature Branches & Scoped Commits:** Keeping pull requests focused on distinct milestones (scaffolding, data fetching, visited highlighting, automated deployment workflow) makes code reviews straightforward.

### What did you enjoy about the project?
- **Building a Zero-Dependency Reactive Store:** Implementing a custom external store with React's modern `useSyncExternalStore` was satisfying. It delivered instant cross-tab synchronization and clean hydration with zero provider boilerplate and zero third-party dependencies.
- **Visual Polish & Space Theme:** Pairing Tailwind v4 with custom Google fonts (Exo 2 for futuristic headings and Geist Sans for readable prose) on a deep-slate canvas gave the site an authentic, immersive space aesthetic.
- **Speed & Simplicity of Edge Static Hosting:** Serving pure pre-compiled HTML and CSS on Wasmer Edge results in instantaneous page loads and low complexity.

### What would you do differently if you could do it over?
- **Automated Testing Suite:** Introduce Vitest and React Testing Library from day one to write automated unit tests for `visited.ts` (state caching, multi-tab events) and `apod.ts` (date math and array slicing).
- **Keyboard Navigation:** Add left/right arrow key listeners on detail pages to quickly flip through consecutive APOD pictures without clicking.
- **Hybrid SSR / Proxy for Infinite History:** If hosted on a platform supporting a Node.js runtime, switch from `output: "export"` to Incremental Static Regeneration (ISR) with an API proxy, allowing users to page back years into the NASA archive rather than being capped at 108 pictures.
