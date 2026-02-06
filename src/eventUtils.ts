import type {
  EventWithNearestStop,
  ParkrunEvent,
  TransportStop,
} from "./types";

export type SortBy = "nearest-stop" | "my-location";
export type SortOrder = "asc" | "desc";
export type UserLocation = { lat: number; lon: number } | null;

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Haversine formula to calculate distance between two points
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function attachNearestStops(
  events: ParkrunEvent[],
  stops: TransportStop[],
  maxDistanceMeters: number,
): EventWithNearestStop[] {
  return events.map((event) => {
    const [eventLon, eventLat] = event.geometry.coordinates;
    let nearestStop: TransportStop | null = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const [stopLon, stopLat] = stop.geometry.coordinates;
      const distance = calculateDistance(eventLat, eventLon, stopLat, stopLon);

      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = stop;
      }
    }

    const eventWithStop: EventWithNearestStop = { ...event };
    if (nearestStop && minDistance <= maxDistanceMeters) {
      eventWithStop.nearestStop = {
        stop: nearestStop,
        distance: minDistance,
      };
    }

    return eventWithStop;
  });
}

export function getUserDistance(
  event: ParkrunEvent,
  userLocation: UserLocation,
): number | null {
  if (!userLocation) return null;

  const [eventLon, eventLat] = event.geometry.coordinates;
  return calculateDistance(
    userLocation.lat,
    userLocation.lon,
    eventLat,
    eventLon,
  );
}

export function getSortKey(
  event: EventWithNearestStop,
  sortBy: SortBy,
  userLocation: UserLocation,
): number {
  if (sortBy === "my-location") {
    const userDistance = getUserDistance(event, userLocation);
    return userDistance ?? Number.POSITIVE_INFINITY;
  }

  return event.nearestStop?.distance ?? Number.POSITIVE_INFINITY;
}

export function sortEvents(
  events: EventWithNearestStop[],
  sortBy: SortBy,
  sortOrder: SortOrder,
  userLocation: UserLocation,
): EventWithNearestStop[] {
  return [...events].sort((a, b) => {
    const aKey = getSortKey(a, sortBy, userLocation);
    const bKey = getSortKey(b, sortBy, userLocation);
    const delta = aKey - bKey;
    return sortOrder === "asc" ? delta : -delta;
  });
}

export function countEventsNearTransport(
  events: EventWithNearestStop[],
): number {
  return events.filter((event) => event.nearestStop).length;
}
