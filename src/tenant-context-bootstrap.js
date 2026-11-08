/**
 * Read-only tenant context bootstrap for the Muhaimin Dairy browser app.
 * No token/context persistence, no implicit multi-tenant selection, no write authority.
 */
const FUNCTION_NAME = 'tenant-context';
function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0; }
function normalizeMembership(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = ['tenant_id','tenant_slug','tenant_name','tenant_status','membership_role','membership_status'];
  if (!keys.every((key) => isNonEmptyString(value[key]))) return null;
  if (typeof value.can_operate !== 'boolean') return null;
  const serverDerivedCanOperate = value.tenant_status === 'active' && value.membership_status === 'active';
  if (value.can_operate !== serverDerivedCanOperate) return null;
  return Object.freeze({ tenantId:value.tenant_id, slug:value.tenant_slug, name:value.tenant_name, tenantStatus:value.tenant_status, membershipRole:value.membership_role, membershipStatus:value.membership_status, canOperate:value.can_operate });
}
export function validateTenantContextResponse(payload, expectedUserId) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok:false, reason:'invalid_response' };
  if (!isNonEmptyString(expectedUserId) || payload.user_id !== expectedUserId) return { ok:false, reason:'identity_mismatch' };
  if (payload.write_authority !== false) return { ok:false, reason:'unsafe_authority_flag' };
  if (payload.platform_role !== null && !isNonEmptyString(payload.platform_role)) return { ok:false, reason:'invalid_platform_role' };
  if (!Array.isArray(payload.memberships)) return { ok:false, reason:'invalid_memberships' };
  const memberships = payload.memberships.map(normalizeMembership);
  if (memberships.some((item) => item === null)) return { ok:false, reason:'invalid_membership_record' };
  if (new Set(memberships.map((item) => item.tenantId)).size !== memberships.length) return { ok:false, reason:'duplicate_membership' };
  const operable = memberships.filter((item) => item.canOperate);
  let status = 'tenant_not_operational';
  let selectedTenant = null;
  if (memberships.length === 0) status = 'no_membership';
  else if (operable.length === 1) { status = 'ready'; selectedTenant = operable[0]; }
  else if (operable.length > 1) status = 'tenant_selection_required';
  return { ok:true, status, userId:expectedUserId, platformRole:payload.platform_role, memberships:Object.freeze(memberships), selectedTenant, writeAuthority:false };
}
export async function loadTenantContext(supabaseClient) {
  if (!supabaseClient?.auth?.getSession || !supabaseClient?.functions?.invoke) return { ok:false, status:'client_unavailable' };
  let initialSession;
  try {
    const result = await supabaseClient.auth.getSession();
    if (result.error) return { ok:false, status:'session_unavailable' };
    initialSession = result.data?.session ?? null;
  } catch { return { ok:false, status:'session_unavailable' }; }
  const expectedUserId = initialSession?.user?.id;
  if (!isNonEmptyString(expectedUserId)) return { ok:false, status:'unauthenticated' };
  let invocation;
  try { invocation = await supabaseClient.functions.invoke(FUNCTION_NAME, { body:{} }); }
  catch { return { ok:false, status:'endpoint_unavailable' }; }
  if (invocation?.error) return { ok:false, status:'endpoint_unavailable' };
  let currentSession;
  try {
    const result = await supabaseClient.auth.getSession();
    if (result.error) return { ok:false, status:'session_changed' };
    currentSession = result.data?.session ?? null;
  } catch { return { ok:false, status:'session_changed' }; }
  if (currentSession?.user?.id !== expectedUserId) return { ok:false, status:'session_changed' };
  const validated = validateTenantContextResponse(invocation?.data, expectedUserId);
  if (!validated.ok) return { ok:false, status:validated.reason };
  return validated;
}
