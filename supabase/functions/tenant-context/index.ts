import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json(401, { error: "missing_bearer_token" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(503, { error: "backend_environment_unavailable" });
  }

  // Validate the caller's JWT with Supabase Auth. Never accept a user_id from the request.
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(match[1]);
  if (authError || !authData.user) return json(401, { error: "invalid_or_expired_session" });

  // Service-role access is confined to this server-side function. The browser never receives this key.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await adminClient.rpc("resolve_tenant_context_for_user", {
    p_user_id: authData.user.id,
  });
  if (error || !data || data.user_id !== authData.user.id) {
    return json(503, { error: "tenant_context_unavailable" });
  }

  const memberships = Array.isArray(data.memberships) ? data.memberships : [];
  return json(200, {
    user_id: authData.user.id,
    platform_role: data.platform_role ?? null,
    memberships,
    has_active_membership: memberships.length > 0,
    can_operate: memberships.some((item: { can_operate?: boolean }) => item.can_operate === true),
    // This endpoint is read-only; it does not authorize or perform operational writes.
    write_authority: false,
  });
});
