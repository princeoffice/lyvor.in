const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "";
const username = "prince.lyvor";
const email = `${username}@lyvor.in`;

if (!baseUrl || !serviceKey || !initialPassword) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_INITIAL_PASSWORD in your local environment before running this script.");
  process.exit(1);
}
if (!/^https:\/\//.test(baseUrl)) {
  console.error("SUPABASE_URL must use HTTPS.");
  process.exit(1);
}
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
async function api(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (!response.ok) throw Object.assign(new Error(payload?.msg || payload?.message || `Supabase request failed (${response.status}).`), { status: response.status, payload });
  return payload;
}

try {
  const listing = await api("/auth/v1/admin/users?page=1&per_page=1000");
  const users = Array.isArray(listing) ? listing : listing?.users || [];
  let user = users.find((u) => String(u.email || "").toLowerCase() === email);
  let created = false;
  if (!user) {
    user = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({
      email, password: initialPassword, email_confirm: true,
      user_metadata: { username, full_name: "Lyvor Administrator" }
    }) });
    created = true;
  }
  if (!user?.id) throw new Error("Supabase did not return the administrator account id.");
  await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ username, email, full_name: user.user_metadata?.full_name || "Lyvor Administrator", role: "admin", ...(created ? { must_change_password: true } : {}) })
  });
  console.log(created ? "Initial Lyvor administrator created. They must change the password at first sign-in." : "Existing Lyvor administrator profile verified; its password was not changed.");
} catch (error) {
  console.error(`Administrator setup failed: ${error.message}`);
  process.exit(1);
}
