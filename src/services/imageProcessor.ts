import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImageResult {
  uri: string;
  width: number;
  height: number;
  base64: string;
  mimeType: 'image/jpeg';
}

/**
 * Preprocesses a raw camera or gallery photo for Gemini vision input.
 * Normalizes orientation, downscales long edge to ~1024px, converts to JPEG,
 * and extracts clean base64 for Cloudflare proxy transport.
 */
export async function preprocessVehicleImage(
  imageUri: string,
  originalWidth?: number,
  originalHeight?: number
): Promise<ProcessedImageResult> {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('IMAGE PREPARATION FAILED: Invalid or missing optical image URI.');
  }

  const TARGET_LONG_EDGE = 1024;
  const actions: ImageManipulator.Action[] = [];

  // Determine aspect-ratio preserving resize action based on dimensions
  if (originalWidth && originalHeight && originalWidth > 0 && originalHeight > 0) {
    if (originalWidth >= originalHeight && originalWidth > TARGET_LONG_EDGE) {
      actions.push({ resize: { width: TARGET_LONG_EDGE } });
    } else if (originalHeight > originalWidth && originalHeight > TARGET_LONG_EDGE) {
      actions.push({ resize: { height: TARGET_LONG_EDGE } });
    }
  } else {
    // If dimensions are missing from asset picker, default resize width to 1024
    actions.push({ resize: { width: TARGET_LONG_EDGE } });
  }

  let result: ImageManipulator.ImageResult;
  try {
    result = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
  } catch {
    throw new Error('IMAGE PREPARATION FAILED: Optical transformation could not decode image.');
  }

  if (!result || !result.base64) {
    throw new Error('IMAGE PREPARATION FAILED: Optical encoder produced an empty payload.');
  }

  // Strip any data-URI prefix if present to ensure clean raw base64 for Gemini
  const cleanBase64 = result.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim();

  if (cleanBase64.length === 0) {
    throw new Error('IMAGE PREPARATION FAILED: Encoded optical payload is zero bytes.');
  }

  // Safe diagnostic log (never logs base64 content or image data)
  console.log(
    `[CarDex Optic] Preprocessed dimensions: ${result.width}x${result.height}, payload size: ${cleanBase64.length} chars (~${Math.round(cleanBase64.length * 0.75 / 1024)} KB)`
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    base64: cleanBase64,
    mimeType: 'image/jpeg',
  };
}
