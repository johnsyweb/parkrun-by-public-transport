import L from "leaflet";
import type {
  ParkrunEvent,
  TransportStop,
  ParkrunEventsData,
  EventWithNearestStop,
} from "./types";
import { DataCache } from "./dataCache";
import {
  attachNearestStops,
  countEventsNearTransport,
  getUserDistance,
  sortEvents,
} from "./eventUtils";

// Fix Leaflet default marker icon paths
const iconProto = L.Icon.Default.prototype as { _getIconUrl?: () => string };
delete iconProto._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

class parkrunTransportApp {
  private map!: L.Map;
  private parkrunEvents: ParkrunEvent[] = [];
  private transportStops: TransportStop[] = [];
  private eventsWithStops: EventWithNearestStop[] = [];
  private maxDistance: number = 1000; // meters (1km)
  private sortBy: "nearest-stop" | "my-location" = "nearest-stop";
  private sortOrder: "asc" | "desc" = "asc";
  private userLocation: { lat: number; lon: number } | null = null;
  private userLocationMarker: L.CircleMarker | null = null;
  private hasAutoPannedToUser: boolean = false;
  private readonly preferencesKey: string = "parkrun-pt-preferences";
  private distanceUpdateTimer: number | null = null;
  private selectedModes: string[] = [
    "METRO TRAIN",
    "REGIONAL TRAIN",
    "METRO TRAM",
    "METRO BUS",
  ];
  private eventMarkers: L.LayerGroup = L.layerGroup();
  private stopMarkers: L.LayerGroup = L.layerGroup();

  async init() {
    this.loadPreferences();
    await this.loadData();
    await this.deferMapInit();
    this.initMap();
    await this.ensureLocationForSorting();
    this.calculateNearestStops();
    this.renderEventList();
    this.setupEventListeners();
    this.applyPreferencesToControls();
    this.updateStats();
  }

  private async deferMapInit() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  private async loadData() {
    try {
      const [eventsData, stopsFeatures] = await Promise.all([
        DataCache.getParkrunEvents() as Promise<ParkrunEventsData>,
        DataCache.getTransportStopsByMode(this.selectedModes),
      ]);

      this.parkrunEvents = eventsData.events.features;
      this.transportStops = stopsFeatures as TransportStop[];

      console.log(`Loaded ${this.parkrunEvents.length} parkrun events`);
      console.log(`Loaded ${this.transportStops.length} transport stops`);
    } catch (error) {
      console.error("Error loading data:", error);
      this.showError(
        "Failed to load data. Please check your internet connection.",
      );
    }
  }

  private initMap() {
    // Initialize map centered on Victoria, Australia
    this.map = L.map("map").setView([-37.8136, 144.9631], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(this.map);

    this.eventMarkers.addTo(this.map);
    this.stopMarkers.addTo(this.map);

    this.map.whenReady(() => {
      // Safari can render blank tiles until size is invalidated.
      setTimeout(() => this.map.invalidateSize(), 0);
    });

    window.addEventListener("resize", () => this.map.invalidateSize());
    window.addEventListener("orientationchange", () =>
      this.map.invalidateSize(),
    );
  }

  private calculateNearestStops() {
    this.eventsWithStops = attachNearestStops(
      this.parkrunEvents,
      this.transportStops,
      this.maxDistance,
    );
  }

  private renderEventList() {
    const eventList = document.getElementById("event-list");
    if (!eventList) return;

    const eventsNearTransport = this.eventsWithStops.filter(
      (event) => event.nearestStop,
    );

    const sortedEvents = sortEvents(
      eventsNearTransport,
      this.sortBy,
      this.sortOrder,
      this.userLocation,
    );

    if (sortedEvents.length === 0) {
      eventList.innerHTML =
        '<p class="loading">No events found within the selected distance.</p>';
      return;
    }

    eventList.innerHTML = sortedEvents
      .map((event) => {
        const distanceKm = (event.nearestStop!.distance / 1000).toFixed(2);
        const mode = event.nearestStop!.stop.properties.MODE;
        const stopName = event.nearestStop!.stop.properties.STOP_NAME;
        const userDistance = getUserDistance(event, this.userLocation);
        const userDistanceText =
          userDistance !== null
            ? `<div class="event-distance">${(userDistance / 1000).toFixed(2)} km from you</div>`
            : "";

        return `
          <div
            class="event-item"
            data-event-id="${event.id}"
            role="button"
            tabindex="0"
            aria-pressed="false"
            aria-label="Focus map on ${event.properties.EventLongName}"
          >
            <div class="event-name">${event.properties.EventLongName}</div>
            <div class="event-location">${event.properties.EventLocation}</div>
            <div class="event-transport">
              <span class="transport-icon">${this.getModeIcon(mode)}</span>
              <span>${distanceKm} km to ${stopName} (${mode})</span>
            </div>
            ${userDistanceText}
          </div>
        `;
      })
      .join("");

    // Add click handlers to event items
    eventList.querySelectorAll<HTMLElement>(".event-item").forEach((item) => {
      item.addEventListener("click", () => {
        const eventId = parseInt(item.getAttribute("data-event-id") || "0");
        this.focusOnEvent(eventId);
      });
      item.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const eventId = parseInt(item.getAttribute("data-event-id") || "0");
        this.focusOnEvent(eventId);
      });
    });

    this.renderMarkers(sortedEvents);
  }

  private renderMarkers(events: EventWithNearestStop[]) {
    this.eventMarkers.clearLayers();
    this.stopMarkers.clearLayers();

    // Custom icons - parkrun events more prominent than transport stops
    const baseUrl = import.meta.env.BASE_URL;
    const parkrunIcon = L.icon({
      iconUrl: `${baseUrl}icons/tree.svg`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    const transportIcon = L.icon({
      iconUrl: `${baseUrl}icons/train.svg`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });

    events.forEach((event) => {
      const [lon, lat] = event.geometry.coordinates;

      const marker = L.marker([lat, lon], { icon: parkrunIcon }).bindPopup(`
          <div class="popup-content">
            <h3>${event.properties.EventLongName}</h3>
            <p><strong>Location:</strong> ${event.properties.EventLocation}</p>
            ${
              event.nearestStop
                ? `
              <p><strong>Nearest Stop:</strong> ${event.nearestStop.stop.properties.STOP_NAME}</p>
              <p><strong>Distance:</strong> ${(event.nearestStop.distance / 1000).toFixed(2)} km</p>
              <p><strong>Mode:</strong> ${event.nearestStop.stop.properties.MODE}</p>
            `
                : ""
            }
          </div>
        `);

      marker.addTo(this.eventMarkers);

      // Add transport stop marker
      if (event.nearestStop) {
        const [stopLon, stopLat] = event.nearestStop.stop.geometry.coordinates;
        const stopMarker = L.marker([stopLat, stopLon], { icon: transportIcon })
          .bindPopup(`
            <div class="popup-content">
              <h3>${event.nearestStop.stop.properties.STOP_NAME}</h3>
              <p><strong>Mode:</strong> ${event.nearestStop.stop.properties.MODE}</p>
              <p><strong>Stop ID:</strong> ${event.nearestStop.stop.properties.STOP_ID}</p>
            </div>
          `);

        stopMarker.addTo(this.stopMarkers);

        // Draw line between event and stop
        L.polyline(
          [
            [lat, lon],
            [stopLat, stopLon],
          ],
          { color: "#667eea", weight: 2, opacity: 0.5, dashArray: "5, 10" },
        ).addTo(this.eventMarkers);
      }
    });

    // Fit map to show all markers
    if (events.length > 0 && this.eventMarkers.getLayers().length > 0) {
      try {
        const markers = this.eventMarkers
          .getLayers()
          .filter((layer): layer is L.Marker => layer instanceof L.Marker);
        const bounds = L.latLngBounds(
          markers.map((marker) => marker.getLatLng()),
        );
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (_) {
        // If no bounds available, keep current map view
        console.log("Using default map view");
      }
    }
  }

  private focusOnEvent(eventId: number) {
    const event = this.eventsWithStops.find((e) => e.id === eventId);
    if (!event) return;

    const [lon, lat] = event.geometry.coordinates;
    this.map.setView([lat, lon], 15);

    // Highlight selected event in list
    document.querySelectorAll(".event-item").forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
      if (parseInt(item.getAttribute("data-event-id") || "0") === eventId) {
        item.classList.add("selected");
        item.setAttribute("aria-pressed", "true");
      }
    });
  }

  private setupEventListeners() {
    const slider = document.getElementById(
      "distance-slider",
    ) as HTMLInputElement;
    const distanceValue = document.getElementById("distance-value");
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    const sortBySelect = document.getElementById(
      "sort-by",
    ) as HTMLSelectElement | null;
    const sortOrderBtn = document.getElementById(
      "sort-order-btn",
    ) as HTMLButtonElement | null;
    const useLocationBtn = document.getElementById(
      "use-location-btn",
    ) as HTMLButtonElement | null;
    const recenterBtn = document.getElementById(
      "recenter-btn",
    ) as HTMLButtonElement | null;
    const modeCheckboxes = document.querySelectorAll<HTMLInputElement>(
      '.mode-filter input[type="checkbox"]',
    );

    if (slider && distanceValue) {
      slider.addEventListener("input", () => {
        const newDistance = parseFloat(slider.value);
        distanceValue.textContent = newDistance.toFixed(1);
        this.maxDistance = newDistance * 1000; // Convert to meters
        if (this.distanceUpdateTimer !== null) {
          window.clearTimeout(this.distanceUpdateTimer);
        }
        this.distanceUpdateTimer = window.setTimeout(() => {
          this.calculateNearestStops();
          this.renderEventList();
          this.updateStats();
          this.savePreferences();
        }, 150);
      });
      slider.addEventListener("change", () => {
        if (this.distanceUpdateTimer !== null) {
          window.clearTimeout(this.distanceUpdateTimer);
          this.distanceUpdateTimer = null;
        }
        this.calculateNearestStops();
        this.renderEventList();
        this.updateStats();
        this.savePreferences();
      });
    }

    if (clearCacheBtn) {
      clearCacheBtn.addEventListener("click", () => {
        if (
          confirm(
            "Clear cached data and reload? This will download fresh data.",
          )
        ) {
          DataCache.clearCache();
          window.location.reload();
        }
      });
    }

    if (sortBySelect) {
      sortBySelect.addEventListener("change", async () => {
        const nextSortBy = sortBySelect.value as "nearest-stop" | "my-location";
        if (nextSortBy === "my-location" && !this.userLocation) {
          const enabled = await this.requestUserLocation();
          if (!enabled) {
            sortBySelect.value = "nearest-stop";
            this.sortBy = "nearest-stop";
            this.renderEventList();
            this.savePreferences();
            return;
          }
        }

        this.sortBy = nextSortBy;
        this.renderEventList();
        this.savePreferences();
      });
    }

    if (sortOrderBtn) {
      sortOrderBtn.addEventListener("click", () => {
        this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
        this.updateSortOrderButton(sortOrderBtn);
        this.renderEventList();
        this.savePreferences();
      });
      this.updateSortOrderButton(sortOrderBtn);
    }

    if (useLocationBtn) {
      useLocationBtn.addEventListener("click", async () => {
        await this.requestUserLocation();
        if (sortBySelect && this.userLocation) {
          sortBySelect.value = "my-location";
          this.sortBy = "my-location";
        }
        this.renderEventList();
        this.savePreferences();
        if (recenterBtn && this.userLocation) {
          recenterBtn.disabled = false;
        }
      });
    }

    if (recenterBtn) {
      recenterBtn.addEventListener("click", () => {
        if (!this.userLocation || !this.map) return;
        this.map.setView(
          [this.userLocation.lat, this.userLocation.lon],
          Math.max(this.map.getZoom(), 13),
        );
      });
    }

    // Mode filter checkboxes
    modeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        this.selectedModes = Array.from(modeCheckboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);

        if (this.selectedModes.length === 0) {
          alert("Please select at least one transport mode");
          (checkbox as HTMLInputElement).checked = true;
          this.selectedModes = Array.from(modeCheckboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);
          return;
        }

        // Reload data with new modes
        await this.reloadWithModes();
        this.savePreferences();
      });
    });
  }

  private async reloadWithModes() {
    const eventList = document.getElementById("event-list");
    if (eventList) {
      eventList.innerHTML = '<p class="loading">Loading transport stops...</p>';
    }

    try {
      const stopsFeatures = await DataCache.getTransportStopsByMode(
        this.selectedModes,
      );
      this.transportStops = stopsFeatures as TransportStop[];
      console.log(
        `Loaded ${this.transportStops.length} transport stops for modes: ${this.selectedModes.join(", ")}`,
      );

      this.calculateNearestStops();
      this.renderEventList();
      this.updateStats();
    } catch (error) {
      console.error("Error loading transport stops:", error);
      this.showError("Failed to load transport stops. Please try again.");
    }
  }

  private updateStats() {
    const statsText = document.getElementById("stats-text");
    if (!statsText) return;

    const eventsNearTransport = countEventsNearTransport(this.eventsWithStops);
    const totalEvents = this.parkrunEvents.length;
    const percentage = ((eventsNearTransport / totalEvents) * 100).toFixed(1);

    statsText.textContent = `${eventsNearTransport} of ${totalEvents} events (${percentage}%) are within ${(this.maxDistance / 1000).toFixed(1)}km of public transport`;
  }

  private updateUserLocationMarker() {
    if (!this.userLocation || !this.map) return;

    const latLng: L.LatLngExpression = [
      this.userLocation.lat,
      this.userLocation.lon,
    ];

    if (!this.userLocationMarker) {
      this.userLocationMarker = L.circleMarker(latLng, {
        radius: 7,
        color: "#4c1a57",
        weight: 2,
        fillColor: "#f7a541",
        fillOpacity: 0.9,
      }).addTo(this.map);

      this.userLocationMarker.bindPopup("You are here");
    } else {
      this.userLocationMarker.setLatLng(latLng);
    }
  }

  private updateSortOrderButton(button: HTMLButtonElement) {
    const isAsc = this.sortOrder === "asc";
    button.textContent = isAsc ? "Closest first" : "Farthest first";
    button.setAttribute("aria-pressed", isAsc ? "false" : "true");
    button.setAttribute(
      "aria-label",
      isAsc ? "Sort closest first" : "Sort farthest first",
    );
  }

  private loadPreferences() {
    if (!window.localStorage) return;

    try {
      const raw = localStorage.getItem(this.preferencesKey);
      if (!raw) return;
      const prefs = JSON.parse(raw) as {
        maxDistanceKm?: number;
        selectedModes?: string[];
        sortBy?: "nearest-stop" | "my-location";
        sortOrder?: "asc" | "desc";
      };

      if (typeof prefs.maxDistanceKm === "number") {
        this.maxDistance = Math.max(0.5, prefs.maxDistanceKm) * 1000;
      }

      if (
        Array.isArray(prefs.selectedModes) &&
        prefs.selectedModes.length > 0
      ) {
        this.selectedModes = prefs.selectedModes;
      }

      if (prefs.sortBy === "nearest-stop" || prefs.sortBy === "my-location") {
        this.sortBy = prefs.sortBy;
      }

      if (prefs.sortOrder === "asc" || prefs.sortOrder === "desc") {
        this.sortOrder = prefs.sortOrder;
      }
    } catch (_) {
      // Ignore malformed preferences
    }
  }

  private savePreferences() {
    if (!window.localStorage) return;

    const prefs = {
      maxDistanceKm: Number((this.maxDistance / 1000).toFixed(1)),
      selectedModes: this.selectedModes,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    try {
      localStorage.setItem(this.preferencesKey, JSON.stringify(prefs));
    } catch (_) {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }

  private applyPreferencesToControls() {
    const slider = document.getElementById(
      "distance-slider",
    ) as HTMLInputElement | null;
    const distanceValue = document.getElementById("distance-value");
    const sortBySelect = document.getElementById(
      "sort-by",
    ) as HTMLSelectElement | null;
    const sortOrderBtn = document.getElementById(
      "sort-order-btn",
    ) as HTMLButtonElement | null;
    const recenterBtn = document.getElementById(
      "recenter-btn",
    ) as HTMLButtonElement | null;
    const modeCheckboxes = document.querySelectorAll<HTMLInputElement>(
      '.mode-filter input[type="checkbox"]',
    );

    if (slider && distanceValue) {
      slider.value = (this.maxDistance / 1000).toFixed(1);
      distanceValue.textContent = (this.maxDistance / 1000).toFixed(1);
    }

    if (sortBySelect) {
      sortBySelect.value = this.sortBy;
    }

    if (sortOrderBtn) {
      this.updateSortOrderButton(sortOrderBtn);
    }

    if (modeCheckboxes.length > 0) {
      modeCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.selectedModes.includes(checkbox.value);
      });
    }

    if (recenterBtn) {
      recenterBtn.disabled = !this.userLocation;
    }
  }

  private updateLocationStatus(message: string, isError: boolean = false) {
    const locationStatus = document.getElementById("location-status");
    if (!locationStatus) return;
    locationStatus.textContent = message;
    locationStatus.classList.toggle("is-error", isError);
  }

  private async requestUserLocation(): Promise<boolean> {
    if (!navigator.geolocation) {
      this.updateLocationStatus("Location: not supported", true);
      return false;
    }

    this.updateLocationStatus("Location: requesting...");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          const accuracyKm = (position.coords.accuracy / 1000).toFixed(1);
          this.updateLocationStatus(`Location: enabled (+/-${accuracyKm} km)`);
          this.updateUserLocationMarker();
          const recenterBtn = document.getElementById(
            "recenter-btn",
          ) as HTMLButtonElement | null;
          if (recenterBtn) {
            recenterBtn.disabled = false;
          }
          if (!this.hasAutoPannedToUser && this.map) {
            this.map.setView(
              [this.userLocation.lat, this.userLocation.lon],
              Math.max(this.map.getZoom(), 13),
            );
            this.hasAutoPannedToUser = true;
          }
          resolve(true);
        },
        (error) => {
          this.userLocation = null;
          const reason =
            error.code === error.PERMISSION_DENIED
              ? "permission denied"
              : error.code === error.TIMEOUT
                ? "request timed out"
                : "unavailable";
          this.updateLocationStatus(`Location: ${reason}`, true);
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  private async ensureLocationForSorting() {
    if (this.sortBy !== "my-location") return;

    const enabled = await this.requestUserLocation();
    if (!enabled) {
      this.sortBy = "nearest-stop";
      this.savePreferences();
    }
  }

  private getModeIcon(mode: string): string {
    const icons: Record<string, string> = {
      "REGIONAL TRAIN": "🚆",
      "METRO TRAIN": "🚇",
      "INTERSTATE TRAIN": "🚆",
      "METRO TRAM": "🚊",
      "METRO BUS": "🚌",
      "REGIONAL BUS": "🚌",
      "REGIONAL COACH": "🚌",
      SKYBUS: "🚌",
    };
    return icons[mode.toUpperCase()] || "🚏";
  }

  private showError(message: string) {
    const eventList = document.getElementById("event-list");
    if (eventList) {
      eventList.innerHTML = `<p class="loading" style="color: red;">${message}</p>`;
    }
  }
}

// Initialize app
const app = new parkrunTransportApp();
app.init();
