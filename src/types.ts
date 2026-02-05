export interface ParkrunEvent {
  id: number;
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    eventname: string;
    EventLongName: string;
    EventShortName: string;
    LocalisedEventLongName: string | null;
    countrycode: number;
    seriesid: number;
    EventLocation: string;
  };
}

export interface TransportStop {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    STOP_ID: string;
    STOP_NAME: string;
    MODE: string;
  };
}

export interface ParkrunEventsData {
  events: {
    type: 'FeatureCollection';
    features: ParkrunEvent[];
  };
}

export interface TransportStopsData {
  type: 'FeatureCollection';
  name: string;
  features: TransportStop[];
}

export interface EventWithNearestStop extends ParkrunEvent {
  nearestStop?: {
    stop: TransportStop;
    distance: number; // in meters
  };
}
