import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedCar, CollectedColour, VehicleIdentificationResult } from '../types/vehicle';

const GARAGE_STORAGE_KEY = '@cardex_garage_vehicles';

/**
 * Maps common automotive paint names to representative hex codes.
 */
export function resolveColourHex(colourName: string): string {
  const normalized = colourName.toLowerCase().trim();

  if (normalized.includes('white') || normalized.includes('pearl') || normalized.includes('ivory')) {
    return '#F8FAFC';
  }
  if (normalized.includes('black') || normalized.includes('midnight') || normalized.includes('obsidian') || normalized.includes('nero')) {
    return '#18181B';
  }
  if (normalized.includes('silver')) {
    return '#CBD5E1';
  }
  if (normalized.includes('grey') || normalized.includes('gray') || normalized.includes('graphite') || normalized.includes('charcoal')) {
    return '#475569';
  }
  if (normalized.includes('blue') || normalized.includes('navy') || normalized.includes('azure') || normalized.includes('sapphire')) {
    return '#1E3A8A';
  }
  if (normalized.includes('red') || normalized.includes('crimson') || normalized.includes('rosso') || normalized.includes('scarlet')) {
    return '#DC2626';
  }
  if (normalized.includes('green') || normalized.includes('racing green') || normalized.includes('emerald') || normalized.includes('olive')) {
    return '#15803D';
  }
  if (normalized.includes('yellow') || normalized.includes('gold')) {
    return '#EAB308';
  }
  if (normalized.includes('orange') || normalized.includes('amber')) {
    return '#EA580C';
  }
  if (normalized.includes('brown') || normalized.includes('bronze') || normalized.includes('tan')) {
    return '#78350F';
  }
  if (normalized.includes('purple') || normalized.includes('violet')) {
    return '#7E22CE';
  }

  return '#334155';
}

/**
 * Loads all saved vehicles from AsyncStorage.
 */
export async function getGarageCars(): Promise<SavedCar[]> {
  try {
    const raw = await AsyncStorage.getItem(GARAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof c.id === 'string' &&
        typeof c.make === 'string' &&
        typeof c.model === 'string'
    );
  } catch {
    return [];
  }
}

/**
 * Retrieves a single saved vehicle by its ID.
 */
export async function getGarageCarById(id: string): Promise<SavedCar | null> {
  const cars = await getGarageCars();
  return cars.find((c) => c.id === id) || null;
}

/**
 * Checks whether a specific scan or vehicle is already saved in the garage.
 * Matches on stable car ID or exact photo image URI, so different cars of the
 * same make/model can be freely added.
 */
export async function isVehicleSaved(carId?: string, imageUri?: string): Promise<boolean> {
  if (!carId && !imageUri) return false;
  const cars = await getGarageCars();
  return cars.some((c) => {
    if (carId && c.id === carId) return true;
    if (imageUri && c.imageUri === imageUri) return true;
    return false;
  });
}

/**
 * Saves a newly identified vehicle to the Garage collection.
 * Prepends the new car to the existing array and writes the complete collection.
 */
export async function saveVehicleToGarage(
  data: VehicleIdentificationResult | SavedCar,
  imageUri: string
): Promise<SavedCar> {
  const cars = await getGarageCars();

  // If this item already has a stored ID, return existing
  if ('id' in data && data.id) {
    const existingById = cars.find((c) => c.id === data.id);
    if (existingById) return existingById;
  }

  // Guard against duplicate image URI for the same scan
  if (imageUri) {
    const existingByImage = cars.find((c) => c.imageUri === imageUri);
    if (existingByImage) return existingByImage;
  }

  const newEntry: SavedCar = {
    id: `car_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    imageUri: imageUri || (data as SavedCar).imageUri || '',
    make: data.make,
    model: data.model,
    variant: data.variant || null,
    colour_name: data.colour_name,
    colour_hex: (data as SavedCar).colour_hex || resolveColourHex(data.colour_name),
    confidence: data.confidence,
    top3: data.top3 || [],
    createdAt: (data as SavedCar).createdAt || new Date().toISOString(),
  };

  const updated = [newEntry, ...cars];
  await AsyncStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(updated));
  return newEntry;
}

/**
 * Removes a vehicle from the Garage by ID.
 */
export async function removeVehicleFromGarage(id: string): Promise<void> {
  const cars = await getGarageCars();
  const filtered = cars.filter((c) => c.id !== id);
  await AsyncStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Aggregates unique collected paint colours from all saved vehicles.
 */
export async function getGarageColours(): Promise<CollectedColour[]> {
  const cars = await getGarageCars();
  const colourMap = new Map<string, CollectedColour>();

  for (const car of cars) {
    const name = car.colour_name || 'Unknown';
    const hex = car.colour_hex || resolveColourHex(name);
    const key = name.toLowerCase().trim();

    const existing = colourMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.carIds.push(car.id);
    } else {
      colourMap.set(key, {
        name,
        hex,
        count: 1,
        carIds: [car.id],
      });
    }
  }

  return Array.from(colourMap.values()).sort((a, b) => b.count - a.count);
}
