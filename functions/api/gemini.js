/**
 * Cloudflare Pages Function — Proxy para Gemini API
 *
 * La API key NUNCA llega al cliente. Se almacena como variable de entorno
 * en Cloudflare Pages: Settings → Environment variables → GEMINI_API_KEY
 *
 * Ruta: /api/gemini  (POST)
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY no configurada en el servidor.' }),
      { status: 500, headers: corsHeaders('application/json') }
    );
  }

  // Leemos el body enviado por el cliente
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Body inválido — se esperaba JSON.' }),
      { status: 400, headers: corsHeaders('application/json') }
    );
  }

  // El cliente puede indicar el modelo y el path exacto, o usamos el default
  const model = body.model || 'gemini-2.5-flash';
  const geminiPath = `/v1beta/models/${model}:generateContent`;
  const geminiUrl = `${GEMINI_BASE}${geminiPath}?key=${apiKey}`;

  // Reenviamos la petición a Gemini (sin exponer la API key al cliente)
  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const geminiData = await geminiResponse.text();

  return new Response(geminiData, {
    status: geminiResponse.status,
    headers: corsHeaders('application/json'),
  });
}

// Preflight CORS para desarrollo local
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(contentType) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}
