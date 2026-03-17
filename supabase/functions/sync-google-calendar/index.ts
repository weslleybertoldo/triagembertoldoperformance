import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gera um access token usando a service account do Google
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado");

  const sa = JSON.parse(serviceAccountJson);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Importa a chave privada RSA da service account
  const pemContents = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signingInput}.${sigB64}`;

  // Troca o JWT por um access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Falha ao obter access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    // Supabase envia o payload no campo "record" para INSERT
    const record = body.record ?? body;

    const { nome, whatsapp, data_agendamento, objetivo } = record;

    if (!data_agendamento) {
      return new Response(
        JSON.stringify({ error: "data_agendamento ausente no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CALENDAR_ID = Deno.env.get("GOOGLE_CALENDAR_ID");
    if (!CALENDAR_ID) throw new Error("GOOGLE_CALENDAR_ID não configurado");

    const accessToken = await getGoogleAccessToken();

    // Monta o evento — duração de 45 minutos (padrão dos slots)
    const inicio = new Date(data_agendamento);
    const fim = new Date(inicio.getTime() + 45 * 60 * 1000);

    const evento = {
      summary: `Triagem — ${nome ?? "Novo aluno"}`,
      description: [
        objetivo ? `Objetivo: ${objetivo}` : null,
        whatsapp ? `WhatsApp: ${whatsapp}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: inicio.toISOString(),
        timeZone: "America/Maceio",
      },
      end: {
        dateTime: fim.toISOString(),
        timeZone: "America/Maceio",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evento),
      }
    );

    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Erro Google Calendar:", JSON.stringify(calData));
      return new Response(
        JSON.stringify({ error: "Falha ao criar evento", details: calData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Evento criado: ${calData.id} — ${nome} — ${inicio.toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, eventId: calData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro na sync-google-calendar:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
