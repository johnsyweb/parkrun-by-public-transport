# parkrun Events by Public Transport

A modern web application to find parkrun events near public transport stops in Victoria, Australia.

## Features

- 🗺️ Interactive map showing parkrun events and nearby transport stops
- 📋 Sort by nearest stop or your location, with reverse ordering
- 🎚️ Adjustable distance filter (0.5km - 5km)
- 📊 Real-time statistics on transit accessibility
- 📱 Responsive design for mobile and desktop

## Data Sources

The application uses locally bundled data files:

- **parkrun events**: `public/data/events.json` (cached from parkrun.com periodically)
- **Transport Victoria stops**: `public/data/public_transport_stops.geojson` (cached from Open Data Portal)

Data is served from the public directory and cached in browser localStorage for 1 week to minimize network requests and improve performance.

### Data Updates

Data files are automatically updated every Monday at 08:00 UTC via GitHub Actions. Manual updates can be triggered via the "Update Data Files" workflow dispatch in GitHub Actions.

## Development

### Prerequisites

- [mise](https://mise.jdx.dev/) - Development environment manager

### Setup

1. Install mise (if you haven't already):

   ```bash
   curl https://mise.run | sh
   ```

2. Install project dependencies (Node.js and pnpm will be installed automatically by mise):
   ```bash
   mise install
   pnpm install
   ```

The `.tool-versions` file specifies the required versions:

- Node.js LTS (latest stable)
- pnpm latest

> [!NOTE]
> GitHub Actions uses the same versions via `jdx/mise-action@v2`, ensuring consistent environments between local development and CI/CD.

### Development Server

```bash
pnpm run dev
```

The app will be available at [http://localhost:5173/](http://localhost:5173/)

On first load, the app will download parkrun events (~870KB) and Transport Victoria stops (~7.3MB) data. This data is then cached in your browser for 1 week.

### Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build

### Browser Cache

The app uses browser localStorage to cache data files:

- Cache expires after 1 week
- Check cache status in browser console
- Clear cache: Open browser DevTools → Console → Run: `DataCache.clearCache()`
- View cache info: `DataCache.getCacheInfo()`

## Tech Stack

- **TypeScript** - Type-safe code
- **Vite** - Fast build tool and dev server
- **Leaflet** - Interactive maps
- **OpenStreetMap** - Map tiles

## Project Structure

```
.
├── src/
│   ├── main.ts                   # Main application logic
│   ├── dataCache.ts              # Browser-side data caching
│   ├── types.ts                  # TypeScript type definitions
│   └── style.css                 # Styles
├── index.html                    # Entry point
├── package.json
└── tsconfig.json
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

By [Pete Johns](https://www.johnsy.com/) ([@johnsyweb](https://github.com/johnsyweb)). Not officially associated with parkrun. Written by parkrun volunteers for parkrun volunteers.
