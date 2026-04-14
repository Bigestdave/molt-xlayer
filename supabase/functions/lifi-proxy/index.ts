const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OKX_WEB3_BASE = "https://web3.okx.com";

async function createOkxSignature(secretKey: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const binary = Array.from(
    new Uint8Array(signature),
    (byte) => String.fromCharCode(byte),
  ).join("");
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const OKX_PROJECT_ID = Deno.env.get("OKX_PROJECT_ID");
  const OKX_API_KEY = Deno.env.get("OKX_API_KEY");
  const OKX_SECRET_KEY = Deno.env.get("OKX_SECRET_KEY");
  const OKX_PASSPHRASE = Deno.env.get("OKX_PASSPHRASE");
  if (!OKX_PROJECT_ID || !OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
    return new Response(
      JSON.stringify({ error: "Missing OKX Web3 credentials (OKX_PROJECT_ID, OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow OKX Web3 DEX paths through this proxy.
    if (!path.startsWith("/api/v5/dex/")) {
      return new Response(
        JSON.stringify({ error: "Invalid path — must start with /api/v5/dex/" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward remaining query params (exclude 'path')
    const forwardParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (key !== "path") forwardParams.set(key, value);
    });

    const queryString = forwardParams.toString();
    const requestPath = `${path}${queryString ? "?" + queryString : ""}`;
    const targetUrl = `${OKX_WEB3_BASE}${requestPath}`;
    const method = req.method.toUpperCase();
    const rawBody = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : "";
    const timestamp = new Date().toISOString();
    const signaturePayload = `${timestamp}${method}${requestPath}${rawBody}`;
    const signature = await createOkxSignature(OKX_SECRET_KEY, signaturePayload);

    const res = await fetch(targetUrl, {
      method,
      headers: {
        "OK-ACCESS-KEY": OKX_API_KEY,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": OKX_PASSPHRASE,
        "OK-ACCESS-PROJECT": OKX_PROJECT_ID,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      ...(rawBody ? { body: rawBody } : {}),
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("OKX DEX proxy error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
