export interface CarModel {
  model: string;
  details: string;
  tank: number;
  avgGas: number;
  avgEth: number;
}

export interface CarConfig {
  model: string;
  details: string;
  tankCapacity: number;
  currentFuel: 'gasoline' | 'ethanol';
  fuelLevel: number; // 0 to 100 percentage
  avgConsumptionGasoline: number;
  avgConsumptionEthanol: number;
  reserveLiters?: number; // Configurable reserve threshold in Liters
  totalOdometerKm?: number; // Total odometer mileage in KM (e.g. 149251)
}

export interface TripData {
  active: boolean;
  paused: boolean;
  distance: number; // meters
  elapsedTime: number; // seconds
  totalFuelConsumed: number; // liters
  speedSamples: number[];
}

export type TripKey = 'a' | 'b';

export interface TripsState {
  a: TripData;
  b: TripData;
}

export interface GpsState {
  active: boolean;
  statusText: string;
  sourceText: string;
  accuracy?: number;
  latitude?: number;
  longitude?: number;
  heading?: number;
  altitude?: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  name: string;
  type?: string;
  modifier?: string;
}

export interface NavigationRoute {
  id: string;
  routeType: 'eco' | 'fastest' | 'shortest' | 'alternative';
  routeName: string;
  originName: string;
  destinationName: string;
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  steps?: RouteStep[];
  litersNeeded: number;
  costEstimatedBrl: number;
  ecoScore: number; // 0 - 100
  fuelSavingsLiters?: number; // Quanto economiza vs rota menos eficiente
  costSavingsBrl?: number;
  fuelSufficiency: string;
  isMostEconomical?: boolean;
  aiComment?: string;
}

export interface FavoriteDestination {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon?: 'home' | 'work' | 'gas' | 'shopping' | 'gym' | 'beach' | 'heart' | 'star' | 'pin';
  category?: string;
  createdAt: number;
}

export type OperatingMode = 'pending' | 'real' | 'simulated';

