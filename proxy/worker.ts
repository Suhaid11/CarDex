export interface Env {
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
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

// OpenRouter Free Vision Fallback for when Google Gemini quotas are temporarily exhausted
async function callOpenRouterFallback(
  apiKey: string,
  image: string,
  mimeType: string
): Promise<VehicleIdentificationResponse | null> {
  const freeVisionModels = [
    'google/gemini-2.0-flash-lite:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen-2.5-vl-72b-instruct:free',
  ];

  for (const model of freeVisionModels) {
    try {
      console.log(`[CARDEX-OPENROUTER] Trying free fallback model: ${model}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://cardex.app',
          'X-Title': 'CarDex',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'You are an expert automotive identification system for the CarDex field guide. ' +
                    'Identify the passenger vehicle in this photo. Respond ONLY with valid JSON strictly conforming to this schema:\n' +
                    '{"make": string, "model": string, "variant": string|null, "colour_name": string, "confidence": number, "top3": [{"make": string, "model": string, "confidence": number}], "car_bbox": {"x": number, "y": number, "width": number, "height": number}}\n' +
                    'If no car is present, set make: "NO_CAR", model: "NONE", colour_name: "NONE", confidence: 0.0.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${image}`,
                  },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.log(`[CARDEX-OPENROUTER] Model ${model} returned status ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      let clean = content.trim();
      if (clean.includes('```')) {
        clean = clean.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      }
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) continue;

      const parsed = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed.make === 'string' && typeof parsed.model === 'string') {
        console.log(`[CARDEX-OPENROUTER] Successfully identified car with ${model}`);
        return {
          make: sanitizeString(parsed.make),
          model: sanitizeString(parsed.model),
          variant: parsed.variant ? sanitizeString(parsed.variant) : null,
          colour_name: sanitizeString(parsed.colour_name || 'Silver'),
          confidence: Math.max(0.0, Math.min(1.0, typeof parsed.confidence === 'number' ? parsed.confidence : 0.85)),
          top3: Array.isArray(parsed.top3)
            ? parsed.top3.slice(0, 3).map((item: { make?: string; model?: string; confidence?: number }) => ({
                make: sanitizeString(item?.make || 'Unknown'),
                model: sanitizeString(item?.model || 'Unknown'),
                confidence: Math.max(0.0, Math.min(1.0, typeof item?.confidence === 'number' ? item?.confidence : 0.5)),
              }))
            : [],
          car_bbox: {
            x: Math.max(0, Math.min(1, typeof parsed.car_bbox?.x === 'number' ? parsed.car_bbox.x : 0.05)),
            y: Math.max(0, Math.min(1, typeof parsed.car_bbox?.y === 'number' ? parsed.car_bbox.y : 0.05)),
            width: Math.max(0.1, Math.min(1, typeof parsed.car_bbox?.width === 'number' ? parsed.car_bbox.width : 0.9)),
            height: Math.max(0.1, Math.min(1, typeof parsed.car_bbox?.height === 'number' ? parsed.car_bbox.height : 0.9)),
          },
        };
      }
    } catch (err) {
      console.log(`[CARDEX-OPENROUTER] Error with ${model}: ${err}`);
    }
  }
  return null;
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
      const openrouterConfigured = Boolean(
        env.OPENROUTER_API_KEY ||
        (typeof process !== 'undefined' && process.env ? process.env.OPENROUTER_API_KEY : undefined)
      );
      return jsonResponse({
        ok: true,
        status: 'online',
        service: 'cardex-proxy',
        primary_model: 'gemini-3.5-flash-lite',
        fallback_models: ['gemini-2.5-flash-lite', 'gemini-3.5-flash'],
        openrouter_backup: openrouterConfigured ? 'ACTIVE' : 'OPTIONAL_NOT_SET',
        quota_tier: '500 RPD / 15 RPM',
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
    const cfIp = request.headers.get('cf-connecting-ip');
    const clientIp = cfIp || 'local-dev';
    const limit = cfIp ? 20 : 35; // Allow slightly higher threshold during local development
    if (!checkRateLimit(clientIp, limit, 60000)) {
      console.log(`[CARDEX] Rate limit exceeded for IP: ${clientIp}`);
      return jsonResponse(
        {
          error: 'Rate limit exceeded: Please wait before scanning again.',
          code: 'RATE_LIMITED',
        },
        429
      );
    }

    // Support both Cloudflare Worker secret binding and process-level env for local testing
    const apiKey =
      env.GEMINI_API_KEY ||
      (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);

    const openrouterKey =
      env.OPENROUTER_API_KEY ||
      (typeof process !== 'undefined' && process.env ? process.env.OPENROUTER_API_KEY : undefined);

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

    // Models arranged by quota availability on Google AI Studio:
    // 1. gemini-3.5-flash-lite: 500 RPD, 15 RPM (highest free tier allowance)
    // 2. gemini-2.5-flash-lite: 20 RPD, 10 RPM (backup lite model)
    // 3. gemini-3.5-flash: 20 RPD, 5 RPM (standard model)
    const CANDIDATE_MODELS = [
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash',
    ];

    try {
      let upstreamResponse: Response | null = null;
      let lastStatus = 500;

      for (const model of CANDIDATE_MODELS) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        console.log(`[CARDEX] Requesting model: ${model}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log(`[CARDEX] Model ${model} status: ${response.status}`);

          if (response.status === 429) {
            console.log(`[CARDEX] Model ${model} quota exhausted (429). Falling back to next candidate...`);
            lastStatus = 429;
            continue;
          }

          if (response.status === 503) {
            console.log(`[CARDEX] Model ${model} busy (503). Falling back to next candidate...`);
            lastStatus = 503;
            continue;
          }

          upstreamResponse = response;
          break;
        } catch (fetchErr) {
          console.log(`[CARDEX] Model ${model} request error: ${fetchErr}`);
        }
      }

      if (!upstreamResponse) {
        // If Google Gemini quotas are exhausted, try OpenRouter free vision models if key is provided
        if (openrouterKey) {
          console.log('[CARDEX] All Gemini models exhausted. Invoking OpenRouter free vision models fallback...');
          const fallbackResult = await callOpenRouterFallback(openrouterKey, image, mime_type);
          if (fallbackResult) {
            if (fallbackResult.make.toUpperCase() === 'NO_CAR') {
              return jsonResponse(
                { error: 'No recognizable passenger vehicle detected in this image. Try a clearer photo containing one car.', code: 'NO_CAR_FOUND' },
                422
              );
            }
            return jsonResponse(fallbackResult, 200);
          }
        }

        if (lastStatus === 429) {
          console.log('[CARDEX] returning: 429 (all models exhausted)');
          return jsonResponse(
            {
              error: 'AI LIMIT REACHED: Free AI quota is temporarily exhausted on all fallback models. Please wait a minute and try again.',
              code: 'RATE_LIMITED',
            },
            429
          );
        }
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
