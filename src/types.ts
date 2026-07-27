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
}

export type OperatingMode = 'pending' | 'real' | 'simulated';
