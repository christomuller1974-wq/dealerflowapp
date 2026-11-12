import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("SITE_URL") || "https://carscoutza.com").replace(/\/$/, "");
const FROM_EMAIL = "CarScoutZA Renewals <renewals@carscoutza.com>";
const TIME_ZONE = "Africa/Johannesburg";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function localDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function displayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, year: "numeric", month: "long", day: "numeric" }).format(new Date(Date.UTC(year, month - 1, day, 10)));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] || character));
}

function validEmail(value: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

function effectiveExpiry(profile: { paid_until: string | null; admin_free_until: string | null }) {
  const values = [profile.paid_until, profile.admin_free_until].filter(Boolean).map((value) => new Date(value as string).getTime()).filter(Number.isFinite);
  return values.length ? new Date(Math.max(...values)) : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) return json({ error: "Service is not configured" }, 503);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: secretAccepted, error: secretError } = await service.rpc("verify_expiry_reminder_cron_secret", { p_secret: request.headers.get("x-cron-secret") || "" });
  if (secretError || secretAccepted !== true) return json({ error: "Unauthorized" }, 401);

  let dryRun = false;
  try { dryRun = (await request.json())?.dry_run === true; } catch { /* empty body is valid */ }

  const today = localDate(new Date());
  const { data: profiles, error: profileError } = await service.from("profiles")
    .select("id,dealer_name,paid_until,admin_free_until,approval_status,dealer_verified,admin_blocked")
    .eq("approval_status", "ACTIVE").eq("dealer_verified", true);
  if (profileError) return json({ error: "Could not load expiry candidates" }, 500);

  const candidates = (profiles || []).flatMap((profile) => {
    if (profile.admin_blocked === true) return [];
    const expiry = effectiveExpiry(profile);
    return expiry && localDate(expiry) === today ? [{ ...profile, effective_expiry: expiry.toISOString() }] : [];
  });
  if (dryRun) return json({ dry_run: true, date: today, eligible: candidates.length });

  const summary = { date: today, eligible: candidates.length, sent: 0, skipped: 0, failed: 0 };
  for (const profile of candidates) {
    const { error: claimError } = await service.from("dealer_expiry_email_log").insert({ dealer_id: profile.id, expiry_date: today, effective_expiry: profile.effective_expiry, status: "PROCESSING", attempts: 1 });
    if (claimError) {
      if (claimError.code === "23505") summary.skipped += 1;
      else { summary.failed += 1; console.error("Could not claim reminder", profile.id, claimError.message); }
      continue;
    }

    const { data: authData, error: authError } = await service.auth.admin.getUserById(profile.id);
    const email = String(authData?.user?.email || "").trim();
    if (authError || !validEmail(email)) {
      summary.skipped += 1;
      await service.from("dealer_expiry_email_log").update({ status: "SKIPPED", email: email || null, error_message: authError ? "Dealer email could not be loaded" : "Dealer email is invalid", updated_at: new Date().toISOString() }).eq("dealer_id", profile.id).eq("expiry_date", today);
      continue;
    }

    const dealerName = String(profile.dealer_name || "Dealer").trim() || "Dealer";
    const expiryLabel = displayDate(today);
    const loginUrl = `${SITE_URL}/login.html`;
    const text = `Hi ${dealerName},\n\nYour CarScoutZA dealer membership expires today, ${expiryLabel}.\n\nTo keep your dealership and vehicles active and visible to buyers, log in and renew your membership:\n${loginUrl}\n\nIf you have already renewed, you can ignore this email.\n\nCarScoutZA`;
    const html = `<!doctype html><html><body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#14213d"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:linear-gradient(135deg,#172554,#2563eb);padding:26px;border-radius:14px 14px 0 0;color:#fff"><h1 style="margin:0;font-size:26px">CarScoutZA membership renewal</h1></div><div style="background:#fff;padding:30px;border-radius:0 0 14px 14px"><p>Hi ${escapeHtml(dealerName)},</p><p>Your CarScoutZA dealer membership expires today, <strong>${escapeHtml(expiryLabel)}</strong>.</p><p>To keep your dealership and vehicles active and visible to buyers, log in and renew your membership.</p><p style="margin:28px 0"><a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Log in to renew</a></p><p style="color:#64748b;font-size:14px">If you have already renewed, you can ignore this email.</p><p>CarScoutZA</p></div></div></body></html>`;
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resendApiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject: "Your CarScoutZA membership expires today", text, html }) });
      const provider = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Resend returned ${response.status}: ${String(provider?.message || "unknown error")}`);
      summary.sent += 1;
      await service.from("dealer_expiry_email_log").update({ status: "SENT", email, provider_message_id: String(provider?.id || "") || null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("dealer_id", profile.id).eq("expiry_date", today);
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : "Unknown email provider error";
      console.error("Reminder send failed", profile.id, message);
      await service.from("dealer_expiry_email_log").update({ status: "FAILED", email, error_message: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("dealer_id", profile.id).eq("expiry_date", today);
    }
  }
  return json(summary);
});
