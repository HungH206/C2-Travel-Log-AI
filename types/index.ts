export interface CalculationResult {
  route_co2: number;
  electric_co2: number;
  total_co2: number;
  distance_km: number;
  summary: string;
  advice: string[];
}

export interface FormData {
  start_location: string;
  destination: string;
  transport_mode: string;
  electricity_kwh: string;
}
