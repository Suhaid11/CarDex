export interface CarBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TopGuess {
  make: string;
  model: string;
  confidence: number;
}

export interface VehicleIdentificationResult {
  make: string;
  model: string;
  variant: string | null;
  colour_name: string;
  confidence: number;
  top3: TopGuess[];
  car_bbox: CarBBox;
}

export type ScanStage = 'IDLE' | 'PREPARING' | 'IDENTIFYING' | 'VALIDATING';

export interface ApiErrorResponse {
  error: string;
  code: 'BAD_REQUEST' | 'NO_CAR_FOUND' | 'RATE_LIMITED' | 'TIMEOUT' | 'SERVER_ERROR';
}

export interface SavedCar {
  id: string;
  imageUri: string;
  make: string;
  model: string;
  variant: string | null;
  colour_name: string;
  colour_hex: string;
  confidence: number;
  top3: TopGuess[];
  createdAt: string;
}

export interface CollectedColour {
  name: string;
  hex: string;
  count: number;
  carIds: string[];
}
