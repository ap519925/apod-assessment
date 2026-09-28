# APOD Explorer

A small Next.js + TypeScript + Tailwind app built for the Stanford Web Services take-home. It shows entries from NASA's [Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html) API in a 3x3 grid, newest first, with Newer/Older paging back through the last 108 pictures. Clicking a card opens a detail page, cards you've already opened are highlighted when you go back, and "Clear history" resets them.

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

- Tests for `visited.ts` and the API sorting/trimming
