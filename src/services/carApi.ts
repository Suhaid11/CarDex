import { VehicleIdentificationResult } from '../types/vehicle';

export type CarApiErrorCode =
  | 'IMAGE_PREPARATION_FAILED'
  | 'NETWORK_LINK_FAILED'
  | 'VISION_SERVICE_UNAVAILABLE'
  | 'AI_LIMIT_REACHED'
  | 'NO_VEHICLE_FOUND'
  | 'IDENTIFICATION_UNCERTAIN'
  | 'INVALID_VEHICLE_DATA';

export class CarApiError extends Error {
  title: string;
  code: CarApiErrorCode;
  status?: number;

  constructor(
    title: string,
    message: string,
    code: CarApiErrorCode,
    status?: number
  ) {
    super(message);
    this.name = 'CarApiError';
    this.title = title;
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates the raw response data received from the proxy.
 * Checks types, ranges, and structures for the CarDex schema.
 */
function validateVehicleResponse(data: unknown): VehicleIdentificationResult {
  if (!data || typeof data !== 'object') {
    throw new CarApiError(
      "CARDEX COULDN'T COMPLETE THE SCAN",
      'Something went wrong while identifying this vehicle.',
      'INVALID_VEHICLE_DATA',
      500
    );
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.make !== 'string' || !obj.make.trim()) {
    throw new CarApiError(
      "CARDEX COULDN'T COMPLETE THE SCAN",
      'Something went wrong while identifying this vehicle.',
      'INVALID_VEHICLE_DATA',
      500
    );
  }
  if (typeof obj.model !== 'string' || !obj.model.trim()) {
    throw new CarApiError(
      "CARDEX COULDN'T COMPLETE THE SCAN",
      'Something went wrong while identifying this vehicle.',
      'INVALID_VEHICLE_DATA',
      500
    );
  }

  const rawConfidence = Number(obj.confidence);
  if (isNaN(rawConfidence) || rawConfidence < 0 || rawConfidence > 1) {
    throw new CarApiError(
      "CARDEX COULDN'T COMPLETE THE SCAN",
      'Something went wrong while identifying this vehicle.',
      'INVALID_VEHICLE_DATA',
      500
    );
  }

  const bbox = obj.car_bbox as Record<string, unknown> | undefined;
  if (!bbox || typeof bbox !== 'object') {
    throw new CarApiError(
      "CARDEX COULDN'T COMPLETE THE SCAN",
      'Something went wrong while identifying this vehicle.',
      'INVALID_VEHICLE_DATA',
      500
    );
  }

  const sanitizedBbox = {
    x: Math.max(0, Math.min(1, Number(bbox.x) || 0)),
    y: Math.max(0, Math.min(1, Number(bbox.y) || 0)),
    width: Math.max(0, Math.min(1, Number(bbox.width) || 0)),
    height: Math.max(0, Math.min(1, Number(bbox.height) || 0)),
  };

  const top3 = Array.isArray(obj.top3)
    ? obj.top3.slice(0, 3).map((item: Record<string, unknown>) => ({
        make: String(item.make || '').trim(),
        model: String(item.model || '').trim(),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
      }))
    : [];

  return {
    make: obj.make.trim().slice(0, 50),
    model: obj.model.trim().slice(0, 50),
    variant: obj.variant ? String(obj.variant).trim().slice(0, 50) : null,
    colour_name: typeof obj.colour_name === 'string' ? obj.colour_name.trim().slice(0, 30) : 'Unknown',
    confidence: rawConfidence,
    top3,
    car_bbox: sanitizedBbox,
  };
}

/**
 * Sends a preprocessed vehicle image to the Cloudflare Worker proxy for vehicle identification.
 */
export async function identifyVehicle(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<VehicleIdentificationResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  // Guard against missing endpoint
  if (!apiUrl || !apiUrl.trim()) {
    throw new CarApiError(
      'CONNECTION PROBLEM',
      "Couldn't reach the CarDex scanner service. Scanner URL is not configured.",
      'VISION_SERVICE_UNAVAILABLE',
      500
    );
  }

  // Guard against localhost on physical mobile devices
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1') || apiUrl.includes('0.0.0.0')) {
    throw new CarApiError(
      'CONNECTION PROBLEM',
      'Cannot use localhost on a physical mobile device. Please use your development machine LAN IP.',
      'NETWORK_LINK_FAILED',
      500
    );
  }

  console.log(`[CarDex API] Request dispatched to proxy. Payload length: ${base64Image.length} chars.`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mime_type: mimeType,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[CarDex API] Response received. HTTP status: ${response.status}`);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 422) {
        throw new CarApiError(
          "COULDN'T IDENTIFY A CAR",
          'Make sure the photo contains a clear view of a passenger vehicle.',
          'NO_VEHICLE_FOUND',
          422
        );
      }
      if (response.status === 429) {
        throw new CarApiError(
          'SCAN LIMIT REACHED',
          'CarDex is taking a short break. Try again in a little while.',
          'AI_LIMIT_REACHED',
          429
        );
      }
      if (response.status === 504) {
        throw new CarApiError(
          'CARDEX TIMED OUT',
          'The vehicle identification took too long. Check your connection and try again.',
          'NETWORK_LINK_FAILED',
          504
        );
      }
      if (response.status === 503) {
        throw new CarApiError(
          "CARDEX COULDN'T COMPLETE THE SCAN",
          'AI service is currently experiencing high demand. Please try again shortly.',
          'VISION_SERVICE_UNAVAILABLE',
          503
        );
      }
      throw new CarApiError(
        "CARDEX COULDN'T COMPLETE THE SCAN",
        'Something went wrong while identifying this vehicle.',
        'VISION_SERVICE_UNAVAILABLE',
        response.status
      );
    }

    return validateVehicleResponse(data);
  } catch (err: unknown) {
    if (err instanceof CarApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CarApiError(
        'CARDEX TIMED OUT',
        'The vehicle identification took too long. Check your connection and try again.',
        'NETWORK_LINK_FAILED',
        504
      );
    }
    throw new CarApiError(
      'CONNECTION PROBLEM',
      "Couldn't reach the CarDex scanner service. Check your connection and try again.",
      'NETWORK_LINK_FAILED'
    );
  }
}
