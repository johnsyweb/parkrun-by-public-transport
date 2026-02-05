import L from "leaflet";
import type {
  ParkrunEvent,
  TransportStop,
  ParkrunEventsData,
  EventWithNearestStop,
} from "./types";
import { DataCache } from "./dataCache";
import "./style.css";

// Fix Leaflet default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
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
  private selectedModes: string[] = [
    "METRO TRAIN",
    "REGIONAL TRAIN",
    "METRO TRAM",
    "METRO BUS",
  ];
  private eventMarkers: L.LayerGroup = L.layerGroup();
  private stopMarkers: L.LayerGroup = L.layerGroup();

  async init() {
    await this.loadData();
    this.initMap();
    this.calculateNearestStops();
    this.renderEventList();
    this.setupEventListeners();
    this.updateStats();
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
    }).addTo(this.map);

    this.eventMarkers.addTo(this.map);
    this.stopMarkers.addTo(this.map);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private calculateNearestStops() {
    this.eventsWithStops = this.parkrunEvents.map((event) => {
      const [eventLon, eventLat] = event.geometry.coordinates;
      let nearestStop: TransportStop | null = null;
      let minDistance = Infinity;

      for (const stop of this.transportStops) {
        const [stopLon, stopLat] = stop.geometry.coordinates;
        const distance = this.calculateDistance(
          eventLat,
          eventLon,
          stopLat,
          stopLon,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop;
        }
      }

      const eventWithStop: EventWithNearestStop = { ...event };
      if (nearestStop && minDistance <= this.maxDistance) {
        eventWithStop.nearestStop = {
          stop: nearestStop,
          distance: minDistance,
        };
      }

      return eventWithStop;
    });
  }

  private renderEventList() {
    const eventList = document.getElementById("event-list");
    if (!eventList) return;

    const eventsNearTransport = this.eventsWithStops
      .filter((event) => event.nearestStop)
      .sort((a, b) => a.nearestStop!.distance - b.nearestStop!.distance);

    if (eventsNearTransport.length === 0) {
      eventList.innerHTML =
        '<p class="loading">No events found within the selected distance.</p>';
      return;
    }

    eventList.innerHTML = eventsNearTransport
      .map((event) => {
        const distanceKm = (event.nearestStop!.distance / 1000).toFixed(2);
        const mode = event.nearestStop!.stop.properties.MODE;
        const stopName = event.nearestStop!.stop.properties.STOP_NAME;

        return `
          <div class="event-item" data-event-id="${event.id}">
            <div class="event-name">${event.properties.EventLongName}</div>
            <div class="event-location">${event.properties.EventLocation}</div>
            <div class="event-transport">
              <span class="transport-icon">${this.getModeIcon(mode)}</span>
              <span>${distanceKm} km to ${stopName} (${mode})</span>
            </div>
          </div>
        `;
      })
      .join("");

    // Add click handlers to event items
    eventList.querySelectorAll(".event-item").forEach((item) => {
      item.addEventListener("click", () => {
        const eventId = parseInt(item.getAttribute("data-event-id") || "0");
        this.focusOnEvent(eventId);
      });
    });

    this.renderMarkers(eventsNearTransport);
  }

  private renderMarkers(events: EventWithNearestStop[]) {
    this.eventMarkers.clearLayers();
    this.stopMarkers.clearLayers();

    // Custom icons
    const parkrunIcon = L.icon({
      iconUrl: "https://img.icons8.com/color/48/000000/running--v1.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const transportIcon = L.icon({
      iconUrl: "https://img.icons8.com/color/48/000000/train.png",
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
        const bounds = L.latLngBounds(
          this.eventMarkers.getLayers().map((layer: any) => layer.getLatLng()),
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
      if (parseInt(item.getAttribute("data-event-id") || "0") === eventId) {
        item.classList.add("selected");
      }
    });
  }

  private setupEventListeners() {
    const slider = document.getElementById(
      "distance-slider",
    ) as HTMLInputElement;
    const distanceValue = document.getElementById("distance-value");
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    const modeCheckboxes = document.querySelectorAll(
      '.mode-filter input[type="checkbox"]',
    );

    if (slider && distanceValue) {
      slider.addEventListener("input", () => {
        const newDistance = parseFloat(slider.value);
        distanceValue.textContent = newDistance.toFixed(1);
        this.maxDistance = newDistance * 1000; // Convert to meters
        this.calculateNearestStops();
        this.renderEventList();
        this.updateStats();
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

    // Mode filter checkboxes
    modeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        this.selectedModes = Array.from(modeCheckboxes)
          .filter((cb: any) => cb.checked)
          .map((cb: any) => cb.value);

        if (this.selectedModes.length === 0) {
          alert("Please select at least one transport mode");
          (checkbox as HTMLInputElement).checked = true;
          this.selectedModes = Array.from(modeCheckboxes)
            .filter((cb: any) => cb.checked)
            .map((cb: any) => cb.value);
          return;
        }

        // Reload data with new modes
        await this.reloadWithModes();
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

    const eventsNearTransport = this.eventsWithStops.filter(
      (e) => e.nearestStop,
    ).length;
    const totalEvents = this.parkrunEvents.length;
    const percentage = ((eventsNearTransport / totalEvents) * 100).toFixed(1);

    statsText.textContent = `${eventsNearTransport} of ${totalEvents} events (${percentage}%) are within ${(this.maxDistance / 1000).toFixed(1)}km of public transport`;
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
