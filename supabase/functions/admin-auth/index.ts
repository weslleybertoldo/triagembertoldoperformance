import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { username, password } = await req.json();
    const valid = username === "weslleybertoldo" && password === "Bt8751bt";
    return new Response(
      JSON.stringify({ success: valid, token: valid ? "admin-token-2026" : null }),
      { status: valid ? 200 : 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ success: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
