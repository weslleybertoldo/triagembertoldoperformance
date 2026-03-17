import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting (resets on cold start — limitação conhecida de edge functions)
const attempts = new Map<string, { count: number; blockedUntil: number }>();

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJWT(secret: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: "admin",
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      })
    )
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = base64url(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${payload}`)))
  );
  return `${header}.${payload}.${sig}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";

    // Rate limiting: 5 tentativas → bloqueio de 15 min por IP
    const entry = attempts.get(clientIP);
    if (entry && entry.blockedUntil > Date.now()) {
      const remaining = Math.ceil((entry.blockedUntil - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ success: false, error: `Bloqueado. Tente novamente em ${remaining} minutos.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CORREÇÃO: sem fallback hardcoded — falha explicitamente se env não configurada
    const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME");
    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
    const JWT_SECRET     = Deno.env.get("ADMIN_JWT_SECRET");

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
      console.error("Variáveis ADMIN_USERNAME, ADMIN_PASSWORD ou ADMIN_JWT_SECRET não configuradas");
      return new Response(
        JSON.stringify({ success: false, error: "Servidor não configurado corretamente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const valid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    if (!valid) {
      const current = attempts.get(clientIP) || { count: 0, blockedUntil: 0 };
      current.count++;
      if (current.count >= 5) {
        current.blockedUntil = Date.now() + 15 * 60 * 1000;
        current.count = 0;
      }
      attempts.set(clientIP, current);
      return new Response(
        JSON.stringify({ success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limpar tentativas após login bem-sucedido
    attempts.delete(clientIP);

    const token = await createJWT(JWT_SECRET);
    return new Response(
      JSON.stringify({ success: true, token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
