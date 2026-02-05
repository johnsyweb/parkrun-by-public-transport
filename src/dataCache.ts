const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class DataCache {
  private static async fetchWithCache<T>(
    url: string,
    cacheKey: string
  ): Promise<T> {
    // Check if we have cached data
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cachedData: CachedData<T> = JSON.parse(cached);
        const age = Date.now() - cachedData.timestamp;
        
        if (age < ONE_WEEK_MS) {
          console.log(`✓ Using cached ${cacheKey} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
          return cachedData.data;
        } else {
          console.log(`⏰ Cache expired for ${cacheKey}, fetching fresh data...`);
        }
      } catch (error) {
        console.warn(`Failed to parse cached ${cacheKey}:`, error);
      }
    }
    
    // Fetch fresh data
    console.log(`📥 Downloading ${cacheKey} from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${cacheKey}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the data (skip if too large)
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now()
      };
      const serialized = JSON.stringify(cachedData);
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
      
      if (sizeInMB > 5) {
        console.log(`⚠️ Skipping cache for ${cacheKey} (${sizeInMB.toFixed(1)}MB is too large)`);
      } else {
        localStorage.setItem(cacheKey, serialized);
        console.log(`✓ Cached ${cacheKey} for 1 week (${sizeInMB.toFixed(1)}MB)`);
      }
    } catch (error) {
      console.warn(`Failed to cache ${cacheKey}:`, error);
      // Continue anyway - we still have the data
    }
    
    return data;
  }
  
  static async getParkrunEvents() {
    return this.fetchWithCache(
      'https://images.parkrun.com/events.json',
      'parkrun-events'
    );
  }
  
  static async getTransportStops() {
    // Use proxy in development, CORS proxy in production
    const url = import.meta.env.DEV
      ? '/api/transport'
      : 'https://corsproxy.io/?' + encodeURIComponent(
          'https://opendata.transport.vic.gov.au/dataset/6d36dfd9-8693-4552-8a03-05eb29a391fd/resource/afa7b823-0c8b-47a1-bc40-ada565f684c7/download/public_transport_stops.geojson'
        );
    
    return this.fetchWithCache(
      url,
      'transport-stops'
    );
  }
  
  static async getTransportStopsByMode(modes: string[]) {
    const allCachedModes = this.getCachedModes();
    const result: any[] = [];
    const modesToFetch: string[] = [];
    
    // Check which modes we have cached
    for (const mode of modes) {
      const cached = localStorage.getItem(`transport-stops-${mode}`);
      if (cached) {
        try {
          const cachedEntry: CachedData<any[]> = JSON.parse(cached);
          const age = Date.now() - cachedEntry.timestamp;
          
          if (age < ONE_WEEK_MS) {
            console.log(`✓ Using cached ${mode} stops (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
            result.push(...cachedEntry.data);
            continue;
          }
        } catch (error) {
          console.warn(`Failed to parse cached ${mode}:`, error);
        }
      }
      modesToFetch.push(mode);
    }
    
    // If all modes are cached, return them
    if (modesToFetch.length === 0) {
      return result;
    }
    
    // Fetch the full dataset once and split by mode
    console.log(`📥 Fetching transport stops (will cache all modes)...`);
    const url = import.meta.env.DEV
      ? '/api/transport'
      : 'https://corsproxy.io/?' + encodeURIComponent(
          'https://opendata.transport.vic.gov.au/dataset/6d36dfd9-8693-4552-8a03-05eb29a391fd/resource/afa7b823-0c8b-47a1-bc40-ada565f684c7/download/public_transport_stops.geojson'
        );
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transport stops: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Split by mode and cache separately
    const modeGroups: Record<string, any[]> = {};
    
    for (const feature of data.features) {
      const mode = feature.properties.MODE;
      if (!modeGroups[mode]) {
        modeGroups[mode] = [];
      }
      modeGroups[mode].push(feature);
    }
    
    // Cache each mode separately
    for (const [mode, features] of Object.entries(modeGroups)) {
      try {
        const cachedData: CachedData<any[]> = {
          data: features,
          timestamp: Date.now()
        };
        const serialized = JSON.stringify(cachedData);
        const sizeInKB = new Blob([serialized]).size / 1024;
        
        localStorage.setItem(`transport-stops-${mode}`, serialized);
        console.log(`✓ Cached ${mode} stops for 1 week (${features.length} stops, ${sizeInKB.toFixed(0)}KB)`);
      } catch (error) {
        console.warn(`Failed to cache ${mode}:`, error);
        // Continue - we still have the data in memory
      }
    }
    
    // Return all requested modes (now that they're all cached/loaded)
    for (const mode of modes) {
      if (modeGroups[mode]) {
        result.push(...modeGroups[mode]);
      }
    }
    
    return result;
  }
  
  static getCachedModes(): string[] {
    const modes: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('transport-stops-') && key !== 'transport-stops') {
        modes.push(key.replace('transport-stops-', ''));
      }
    }
    return modes;
  }
  
  static clearCache() {
    localStorage.removeItem('parkrun-events');
    localStorage.removeItem('transport-stops');
    console.log('Cache cleared');
  }
  
  static getCacheInfo() {
    const events = localStorage.getItem('parkrun-events');
    const stops = localStorage.getItem('transport-stops');
    
    const info: Record<string, { age: number; size: number } | null> = {
      'parkrun-events': null,
      'transport-stops': null
    };
    
    if (events) {
      try {
        const cached = JSON.parse(events);
        info['parkrun-events'] = {
          age: Date.now() - cached.timestamp,
          size: new Blob([events]).size
        };
      } catch (e) {
        // ignore
      }
    }
    
    if (stops) {
      try {
        const cached = JSON.parse(stops);
        info['transport-stops'] = {
          age: Date.now() - cached.timestamp,
          size: new Blob([stops]).size
        };
      } catch (e) {
        // ignore
      }
    }
    
    return info;
  }
}
