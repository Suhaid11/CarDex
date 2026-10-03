export interface Env {
  GEMINI_API_KEY?: string;
}

interface IdentifyRequestBody {
  image: string;
  mime_type: string;
}

interface VehicleIdentificationResponse {
  make: string;
  model: string;
  variant: string | null;
  colour_name: string;
  confidence: number;
  top3: Array<{
    make: string;
    model: string;
    confidence: number;
  }>;
  car_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
    },
  });
}

function sanitizeString(str: unknown, maxLen = 80): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

// Lightweight in-memory rate limiter per IP (max 20 scans per minute per client)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIp: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (rateLimitMap.size > 200) {
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) rateLimitMap.delete(ip);
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          ...SECURITY_HEADERS,
        },
      });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if ((url.pathname === '/health' || url.pathname === '/') && request.method === 'GET') {
      return jsonResponse({
        ok: true,
        status: 'online',
        service: 'cardex-proxy',
        model: 'gemini-3.5-flash',
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname !== '/identify') {
      return jsonResponse({ error: 'Endpoint not found', code: 'BAD_REQUEST' }, 404);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed. Use POST.', code: 'BAD_REQUEST' }, 405);
    }

    // Rate limiting abuse protection on /identify
    const clientIp = request.headers.get('cf-connecting-ip') || 'global';
    if (!checkRateLimit(clientIp, 20, 60000)) {
      console.log(`[CARDEX] Rate limit exceeded for IP: ${clientIp}`);
      return jsonResponse(
        {
          error: 'Rate limit exceeded: Please wait before scanning again.',
          code: 'RATE_LIMITED',
        },
        429
      );
    }

    // Support both Cloudflare Worker secret binding (env.GEMINI_API_KEY) and process-level env for local testing
    const apiKey =
      env.GEMINI_API_KEY ||
      (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);

    if (!apiKey) {
      console.log('[CARDEX] Server configuration error: GEMINI_API_KEY missing');
      return jsonResponse(
        {
          error: 'Server configuration error: GEMINI_API_KEY is not configured in Worker environment.',
          code: 'SERVER_ERROR',
        },
        500
      );
    }

    let payload: IdentifyRequestBody;
    try {
      payload = await request.json();
    } catch {
      console.log('[CARDEX] returning: 400 (Invalid JSON)');
      return jsonResponse({ error: 'Invalid JSON request payload.', code: 'BAD_REQUEST' }, 400);
    }

    const { image, mime_type } = payload;
    if (!image || typeof image !== 'string') {
      console.log('[CARDEX] returning: 400 (Missing image)');
      return jsonResponse({ error: 'Missing or invalid base64 "image" field.', code: 'BAD_REQUEST' }, 400);
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!mime_type || !allowedMime.includes(mime_type)) {
      console.log(`[CARDEX] returning: 400 (Invalid mime_type: ${mime_type})`);
      return jsonResponse(
        {
          error: `Invalid mime_type. Expected one of: ${allowedMime.join(', ')}`,
          code: 'BAD_REQUEST',
        },
        400
      );
    }

    // Limit maximum base64 length to ~8MB to protect free tier limits
    if (image.length > 8 * 1024 * 1024) {
      console.log('[CARDEX] returning: 400 (Payload exceeds size limit)');
      return jsonResponse({ error: 'Image payload exceeds 8MB size limit.', code: 'BAD_REQUEST' }, 400);
    }

    console.log(`[CARDEX] /identify received. MIME: ${mime_type}, base64 length: ${image.length} chars`);
    console.log('[CARDEX] image accepted');

    // Gemini 3.5 Flash structured output schema
    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text:
                'You are an expert automotive identification system for the CarDex field guide. ' +
                'Identify the passenger vehicle in this photo. ' +
                'Determine the make/manufacturer, model, visually verifiable variant/trim, visible primary colour name, ' +
                'confidence estimate (between 0.0 and 1.0), up to three plausible alternative models (top3), and normalized ' +
                'bounding box coordinates (x, y, width, height between 0.0 and 1.0). ' +
                'If there is NO recognizable car or motor vehicle in the image, output make: "NO_CAR", model: "NONE", colour_name: "NONE", confidence: 0.0. ' +
                'Never fabricate an exact trim if not clearly visible.',
            },
            {
              inline_data: {
                mime_type,
                data: image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            make: { type: 'STRING' },
            model: { type: 'STRING' },
            variant: { type: 'STRING', nullable: true },
            colour_name: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            top3: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  make: { type: 'STRING' },
                  model: { type: 'STRING' },
                  confidence: { type: 'NUMBER' },
                },
                required: ['make', 'model', 'confidence'],
              },
            },
            car_bbox: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER' },
                y: { type: 'NUMBER' },
                width: { type: 'NUMBER' },
                height: { type: 'NUMBER' },
              },
              required: ['x', 'y', 'width', 'height'],
            },
          },
          required: ['make', 'model', 'colour_name', 'confidence', 'top3', 'car_bbox'],
        },
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    try {
      console.log('[CARDEX] Gemini request started (gemini-3.5-flash)');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const upstreamResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[CARDEX] Gemini status: ${upstreamResponse.status}`);

      if (upstreamResponse.status === 429) {
        console.log('[CARDEX] returning: 429');
        return jsonResponse(
          {
            error: 'AI LIMIT REACHED: Free AI quota is temporarily exhausted. Try again later.',
            code: 'RATE_LIMITED',
          },
          429
        );
      }

      if (upstreamResponse.status === 503) {
        console.log('[CARDEX] returning: 503');
        return jsonResponse(
          {
            error: 'AI service is currently experiencing high demand. Please try again shortly.',
            code: 'SERVICE_UNAVAILABLE',
          },
          503
        );
      }

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text().catch(() => '');
        console.log(`[CARDEX] Upstream Gemini error: HTTP ${upstreamResponse.status} - ${errorText.slice(0, 150)}`);
        console.log('[CARDEX] returning: 500');
        return jsonResponse(
          {
            error: `Upstream AI service error (${upstreamResponse.status}).`,
            code: 'SERVER_ERROR',
          },
          500
        );
      }

      const upstreamData = (await upstreamResponse.json()) as {
        candidates?: Array<{
          finishReason?: string;
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidate = upstreamData.candidates?.[0];
      const rawJson = candidate?.content?.parts?.[0]?.text;
      if (!rawJson) {
        console.log(`[CARDEX] Missing candidate text. Finish reason: ${candidate?.finishReason || 'UNKNOWN'}`);
        console.log('[CARDEX] returning: 422');
        return jsonResponse(
          { error: 'No recognizable passenger vehicle detected in this image. Try a clearer photo containing one car.', code: 'NO_CAR_FOUND' },
          422
        );
      }

      let parsed: VehicleIdentificationResponse;
      try {
        let cleanJson = rawJson.trim();
        if (cleanJson.includes('```')) {
          cleanJson = cleanJson.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        }
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }
        parsed = JSON.parse(cleanJson);
        console.log('[CARDEX] Gemini response parse: success');
      } catch {
        console.log(`[CARDEX] Gemini response parse: failure. Raw snippet: ${rawJson.slice(0, 100)}`);
        console.log('[CARDEX] returning: 500');
        return jsonResponse(
          { error: 'Something went wrong while identifying the car.', code: 'SERVER_ERROR' },
          500
        );
      }

      // Check for controlled NO_CAR response
      if (
        (parsed.make && parsed.make.toUpperCase() === 'NO_CAR') ||
        (parsed.model && parsed.model.toUpperCase() === 'NONE') ||
        parsed.confidence === 0
      ) {
        console.log('[CARDEX] returning: 422 (NO_CAR response)');
        return jsonResponse(
          {
            error: 'No recognizable passenger vehicle detected in this image. Try a clearer photo containing one car.',
            code: 'NO_CAR_FOUND',
          },
          422
        );
      }

      // Strict validation, sanitization of fields, and bounds
      const sanitized: VehicleIdentificationResponse = {
        make: sanitizeString(parsed.make, 50) || 'Unknown',
        model: sanitizeString(parsed.model, 50) || 'Unknown',
        variant: parsed.variant ? sanitizeString(parsed.variant, 50) : null,
        colour_name: sanitizeString(parsed.colour_name, 30) || 'Unknown',
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        top3: Array.isArray(parsed.top3)
          ? parsed.top3.slice(0, 3).map((item) => ({
              make: sanitizeString(item.make, 50),
              model: sanitizeString(item.model, 50),
              confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
            }))
          : [],
        car_bbox: {
          x: Math.max(0, Math.min(1, Number(parsed.car_bbox?.x) || 0)),
          y: Math.max(0, Math.min(1, Number(parsed.car_bbox?.y) || 0)),
          width: Math.max(0, Math.min(1, Number(parsed.car_bbox?.width) || 0)),
          height: Math.max(0, Math.min(1, Number(parsed.car_bbox?.height) || 0)),
        },
      };

      console.log(`[CARDEX] returning: 200 (${sanitized.make} ${sanitized.model})`);
      return jsonResponse(sanitized, 200);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[CARDEX] returning: 504 (timeout)');
        return jsonResponse(
          { error: 'Vehicle identification request timed out after 25s.', code: 'TIMEOUT' },
          504
        );
      }

      console.log('[CARDEX] returning: 500 (internal exception)');
      return jsonResponse(
        { error: 'Internal proxy error during identification.', code: 'SERVER_ERROR' },
        500
      );
    }
  },
};
