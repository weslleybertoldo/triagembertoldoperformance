import { supabase } from "@/integrations/supabase/client";

export const adminApi = async (action: string, params: Record<string, unknown> = {}) => {
  const token = sessionStorage.getItem("admin_token");
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("admin-operations", {
    body: { action, ...params },
    headers: { "x-admin-token": token },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
