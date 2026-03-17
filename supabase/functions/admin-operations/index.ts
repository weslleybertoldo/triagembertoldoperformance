import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));
    if (!payload.exp || payload.exp < Date.now() / 1000) return false;
    if (payload.sub !== "admin") return false;

    // CORREÇÃO: sem fallback hardcoded — falha se env não configurada
    const JWT_SECRET = Deno.env.get("ADMIN_JWT_SECRET");
    if (!JWT_SECRET) {
      console.error("ADMIN_JWT_SECRET não configurado");
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64urlDecode(parts[2]);
    return await crypto.subtle.verify("HMAC", key, new Uint8Array(signature) as ArrayBufferView<ArrayBuffer>, signatureInput);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verificar token admin
  const adminToken = req.headers.get("x-admin-token");
  if (!adminToken || !(await verifyAdminToken(adminToken))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      // ===== TRIAGENS =====
      case "list_triagens": {
        const { data, error } = await supabase
          .from("tb_agendamentos_triagem")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200); // CORREÇÃO: limite para evitar carregar tabela inteira
        if (error) throw error;
        return json({ data });
      }

      case "update_triagem_tags": {
        const { id, tags } = params;
        const { error } = await supabase
          .from("tb_agendamentos_triagem")
          .update({ tags })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "update_triagem_status": {
        const { id, status } = params;
        const { error } = await supabase
          .from("tb_agendamentos_triagem")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "delete_triagem": {
        const { id } = params;
        const { error } = await supabase
          .from("tb_agendamentos_triagem")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      // ===== ALUNOS =====
      case "list_alunos": {
        const { data, error } = await supabase
          .from("tb_alunos")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200); // CORREÇÃO: limite para evitar carregar tabela inteira
        if (error) throw error;
        return json({ data });
      }

      case "toggle_aluno_access": {
        const { id, acesso_liberado } = params;
        const { error } = await supabase
          .from("tb_alunos")
          .update({ acesso_liberado })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "update_aluno": {
        const { id, nome, email, whatsapp } = params;
        const updateData: Record<string, unknown> = {};
        if (nome !== undefined) updateData.nome = nome;
        if (email !== undefined) updateData.email = email;
        if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
        const { error } = await supabase
          .from("tb_alunos")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "delete_aluno": {
        const { id } = params;
        // Excluir consultas primeiro
        await supabase.from("tb_consultas").delete().eq("aluno_id", id);
        // Excluir aluno
        const { error } = await supabase.from("tb_alunos").delete().eq("id", id);
        if (error) throw error;
        // Excluir usuário do auth
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) console.error("Auth delete error:", authError.message);
        return json({ success: true });
      }

      // ===== CONSULTAS =====
      case "list_consultas": {
        const { aluno_id } = params;
        const { data, error } = await supabase
          .from("tb_consultas")
          .select("*")
          .eq("aluno_id", aluno_id)
          .order("data_consulta", { ascending: false })
          .limit(200); // CORREÇÃO: limite para evitar carregar tabela inteira
        if (error) throw error;
        return json({ data });
      }

      case "count_pending_consultas": {
        const hoje = new Date().toISOString();
        const { count, error } = await supabase
          .from("tb_consultas")
          .select("*", { count: "exact", head: true })
          .or(`status.eq.aguardando,and(status.eq.confirmada,data_consulta.gte.${hoje})`);
        if (error) throw error;
        return json({ count: count || 0 });
      }

      case "update_consulta_status": {
        const { id, status } = params;
        const { error } = await supabase
          .from("tb_consultas")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "reschedule_consulta": {
        const { id, data_consulta } = params;
        const { error } = await supabase
          .from("tb_consultas")
          .update({ data_consulta })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "create_consulta": {
        const { aluno_id, data_consulta, observacao } = params;
        const { error } = await supabase
          .from("tb_consultas")
          .insert({
            aluno_id,
            data_consulta,
            status: "confirmada",
            criado_por: "admin",
            observacao: observacao || null,
          });
        if (error) throw error;
        return json({ success: true });
      }

      case "delete_consulta": {
        const { id } = params;
        const { error } = await supabase
          .from("tb_consultas")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      // ===== TAGS =====
      case "list_tags": {
        const { data, error } = await supabase
          .from("tb_tags")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }

      case "create_tag": {
        const { nome, cor } = params;
        const { error } = await supabase.from("tb_tags").insert({ nome, cor });
        if (error) throw error;
        return json({ success: true });
      }

      case "update_tag": {
        const { id, nome, cor } = params;
        const { error } = await supabase
          .from("tb_tags")
          .update({ nome, cor })
          .eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "delete_tag": {
        const { id } = params;
        const { error } = await supabase.from("tb_tags").delete().eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "seed_tags": {
        const { tags } = params;
        const { error } = await supabase.from("tb_tags").insert(tags);
        if (error) throw error;
        const { data } = await supabase
          .from("tb_tags")
          .select("*")
          .order("created_at", { ascending: false });
        return json({ data });
      }

      // ===== ALL CONSULTAS =====
      case "list_all_consultas": {
        const { data, error } = await supabase
          .from("tb_consultas")
          .select("*")
          .order("data_consulta", { ascending: false })
          .limit(200); // CORREÇÃO: limite para evitar carregar tabela inteira
        if (error) throw error;
        return json({ data });
      }

      // ===== ADMINS =====
      case "list_admins": {
        const { data, error } = await supabase
          .from("tb_admins")
          .select("*")
          .order("criado_em", { ascending: true });
        if (error) throw error;
        return json({ data });
      }

      case "create_admin": {
        const { email } = params;
        const { error } = await supabase.from("tb_admins").insert({ email });
        if (error) throw error;
        return json({ success: true });
      }

      case "delete_admin": {
        const { id } = params;
        const { error } = await supabase.from("tb_admins").delete().eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
