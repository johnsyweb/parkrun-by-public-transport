# parkrun Events by Public Transport

A modern web application to find parkrun events near public transport stops in Victoria, Australia.

## Features

- 🗺️ Interactive map showing parkrun events and nearby transport stops
- 📋 Sortable list of events by distance to nearest stop
- 🎚️ Adjustable distance filter (0.5km - 5km)
- 📊 Real-time statistics on transit accessibility
- 📱 Responsive design for mobile and desktop

## Data Sources

The application fetches and caches data directly in your browser from:

- **parkrun events**: [https://images.parkrun.com/events.json](https://images.parkrun.com/events.json)
- **Transport Victoria stops**: [Open Data Portal](https://opendata.transport.vic.gov.au/)

Data is cached in browser localStorage for 1 week to minimize network requests and improve performance.

## Development

### Prerequisites

- Node.js 18+ 
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at [http://localhost:5173/](http://localhost:5173/)

On first load, the app will download parkrun events (~870KB) and Transport Victoria stops (~7.3MB) data. This data is then cached in your browser for 1 week.

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

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

MIT
