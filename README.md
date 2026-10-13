# parkrun Events by Public Transport

A modern web application to find parkrun events near public transport stops in Victoria, Australia.

## Features

- 🗺️ Interactive map showing parkrun events and nearby transport stops
- 📋 Sort by nearest stop or your location, with closest/farthest ordering
- 🎚️ Adjustable distance filter (0.5km - 5km)
- 📊 Live count and percentage of events within the selected distance
- 📍 "You are here" marker with a recenter control
- 💾 Preferences saved in your browser
- 📱 Responsive design for mobile and desktop

## Data Sources

Third-party datasets are **not** kept in git. They are downloaded into `public/data/` when you fetch, build, or run checks:

- **parkrun events**: `public/data/events.json` (from parkrun.com)
- **Transport Victoria stops**: `public/data/public_transport_stops.geojson` (from the Open Data Portal)

Each file carries a top-level `builtAt` UTC ISO timestamp set when that file was last fetched. The footer shows “(as of …)” next to each data source link, using the stamp from the dataset currently loaded in the browser (including when served from localStorage). Cached payloads without a valid `builtAt` are treated as stale and refetched once.

`aube run fetch:public-data` resolves the Transport Victoria stops download URL via the CKAN `package_show` API for the [Public Transport Lines and Stops](https://opendata.transport.vic.gov.au/dataset/public-transport-lines-and-stops) dataset, so republished resource UUIDs do not break fetches. It stamps each downloaded file with `builtAt` after a successful download. Downloads fail closed on HTTP errors; `aube run validate:public-data` must pass before a build or check succeeds—so HTML error pages are not saved as `.geojson`.

Fetched files are gitignored. After cloning, fetch once before `dev` (or run `check` / `build`, which fetch for you):

```bash
aube run fetch:public-data
aube run validate:public-data
```

### Data Updates

CI fetches fresh data on every deploy and weekly on Mondays at 08:00 UTC (scheduled Pages build). You can also re-run the “Build and Deploy to GitHub Pages” workflow manually. The live site always ships whatever was fetched for that build; the browser still caches downloaded files in localStorage for 1 week.

## Development

New to the project? Start here:

1. Install prerequisites.
2. Install dependencies.
3. Fetch public data.
4. Run the dev server.
5. Make changes and run the checks.

### Prerequisites

- [mise](https://mise.jdx.dev/) - Development environment manager

### Setup

1. Install mise (if you haven't already):

   ```bash
   curl https://mise.run | sh
   ```

2. Install project tools and runtime (Node.js and aube will be installed automatically by mise):

   ```bash
   mise install
   ```

3. Download parkrun and transport datasets (required before `aube run dev`):
   ```bash
   aube run fetch:public-data
   ```

The `.mise.toml` file specifies the required versions:

- Node.js LTS
- aube latest

> [!NOTE]
> GitHub Actions uses the same versions via `jdx/mise-action@v2`, ensuring consistent environments between local development and CI/CD.

### Development Server

```bash
aube run dev
```

The app will be available at [http://localhost:5173/](http://localhost:5173/)

On first load, the app will download parkrun events (~870KB) and Transport Victoria stops (~7.3MB) data. This data is then cached in your browser for 1 week.

### Scripts

- `aube run dev` - Start development server
- `aube run build` - Fetch public data, then build for production (icons, `public/sitemap.xml`, Vite)
- `aube run preview` - Preview production build
- `aube test` - Run unit tests
- `aube run test:lighthouse` - Run Lighthouse against the preview build
- `aube run test:watch` - Run tests in watch mode
- `aube run lint` - Run ESLint
- `aube run format` - Format with Prettier
- `aube run validate:public-data` - Verify `public/data/*.json` and `*.geojson` parse, match expected shapes, and include a valid `builtAt`
- `aube run fetch:public-data` - Download parkrun events and Transport Victoria stops into `public/data`, stamping each file with `builtAt`
- `aube run generate:screenshot` - Capture `public/screenshot-desktop.png` (and `dist/`) for social previews and docs (requires Playwright Chromium: `aube exec playwright install chromium`)
- `aube run check` - Run typecheck, fetch and validate public data, tests, Lighthouse, lint, and format check

### Lighthouse Checks

`aube run test:lighthouse` builds the site, serves it via `vite preview`, and runs
Lighthouse with strict thresholds:

- Accessibility, Best Practices, and SEO must score 100.
- Performance is reported but does not fail the build.

To override the target URL or timeout locally, set:

- `LIGHTHOUSE_URL`
- `LIGHTHOUSE_PORT`
- `LIGHTHOUSE_TIMEOUT_MS`

CI uploads Lighthouse reports to temporary public storage. To override the
upload target, set `LIGHTHOUSE_UPLOAD_TARGET`.

### Location Permissions

Sorting by your location or showing the "You are here" marker uses the browser
geolocation API. The app only stores your preferences (not your coordinates)
in localStorage. You can deny location access and still use the app.

### Contributing

First-time contributors are welcome. A good first change is a copy edit in the
README, UI text, or a small CSS tweak.

Before opening a PR:

1. Run `aube run check`.
2. Describe the user-visible behavior change in the PR.
3. Add screenshots for UI changes when possible.

### Browser Cache

The app uses browser localStorage to cache data files:

- Cache expires after 1 week
- Check cache status in browser console
- Clear cache: Open browser DevTools → Console → Run: `DataCache.clearCache()` (this removes parkrun data, the shared transport entry, and per-mode transport caches)
- If the app reports that data could not be read, try a refresh; if it persists, clear cache or site data for this origin and reload
- View cache info: `DataCache.getCacheInfo()`

## Tech Stack

- **TypeScript** - Type-safe code
- **Vite** - Fast build tool and dev server
- **Leaflet** - Interactive maps
- **OpenStreetMap** - Map tiles

## Project Structure

```
.
├── scripts/
│   ├── fetch-public-data.ts      # Resolve CKAN URL + download (gitignored outputs)
│   ├── generate-screenshot.ts    # App UI capture → screenshot-desktop.png
│   └── validate-public-data.ts   # CI/local check for public/data shape
├── src/
│   ├── __tests__/                # Unit tests (Vitest)
│   ├── main.ts                   # Main application logic
│   ├── eventUtils.ts             # Reusable event utilities
│   ├── dataCache.ts              # Browser-side data caching
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils/                    # Shared helpers (URLs, JSON parsing, errors)
│   └── style.css                 # Styles
├── public/
│   ├── data/                     # Fetched parkrun + transport datasets (gitignored)
│   └── screenshot-desktop.png    # App screenshot used for og:image / social previews
├── index.html                    # Entry point
├── package.json
└── tsconfig.json
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

By [Pete Johns](https://www.johnsy.com/) ([@johnsyweb](https://github.com/johnsyweb)). Not officially associated with parkrun. Written by parkrun volunteers for parkrun volunteers.
