import { createClient } from "npm:@supabase/supabase-js@2";
import { json, signature } from "../_shared/payfast.ts";

const siteUrl = (Deno.env.get("SITE_URL") || "https://carscoutza.com").replace(/\/$/, "");
const cors = {
  "access-control-allow-origin": siteUrl,
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  try {
    const authorization = request.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");

    if (!merchantId || !merchantKey || !passphrase) {
      return json({ error: "Secure featured checkout is not configured." }, 503, cors);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Please sign in again." }, 401, cors);

    let body: { vehicle_id?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "A vehicle must be selected." }, 400, cors);
    }
    const vehicleId = typeof body.vehicle_id === "string" ? body.vehicle_id.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vehicleId)) {
      return json({ error: "Invalid vehicle selection." }, 400, cors);
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("dealer_name,approval_status,dealer_verified,admin_blocked,admin_free_until,paid_until")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return json({ error: "Dealer profile not found." }, 404, cors);
    if (profile.approval_status !== "ACTIVE" || profile.dealer_verified !== true || profile.admin_blocked === true) {
      return json({ error: "This dealership is not eligible to feature vehicles." }, 403, cors);
    }

    const now = Date.now();
    const freeActive = Boolean(profile.admin_free_until && new Date(profile.admin_free_until).getTime() > now);
    const paidActive = Boolean(profile.paid_until && new Date(profile.paid_until).getTime() > now);
    if (!freeActive && !paidActive) {
      return json({ error: "An active dealer membership is required before a vehicle can be featured." }, 403, cors);
    }

    const { data: vehicle, error: vehicleError } = await service
      .from("vehicles")
      .select("id,title,year,make,model")
      .eq("id", vehicleId)
      .eq("user_id", user.id)
      .single();
    if (vehicleError || !vehicle) return json({ error: "Vehicle not found for this dealer." }, 404, cors);

    const vehicleTitle = String(
      vehicle.title || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Featured Vehicle",
    ).slice(0, 160);
    const internalReference = `feature_${crypto.randomUUID()}`;
    const paymentId = `CSZ-FTR-${crypto.randomUUID()}`;
    const { error: insertError } = await service.from("featured_vehicle_payments").insert({
      dealer_id: user.id,
      vehicle_id: vehicle.id,
      vehicle_title: vehicleTitle,
      internal_reference: internalReference,
      m_payment_id: paymentId,
      amount: 200,
      currency: "ZAR",
      status: "PENDING",
    });
    if (insertError) throw insertError;

    const supabaseProjectUrl = supabaseUrl.replace(/\/$/, "");
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/featured-payment-success.html?payment=${encodeURIComponent(internalReference)}`,
      cancel_url: `${siteUrl}/dealer-admin.html?featured_cancelled=1`,
      notify_url: `${supabaseProjectUrl}/functions/v1/featured-payfast-itn`,
      name_first: String(profile.dealer_name || "CarScoutZA Dealer").slice(0, 100),
      email_address: String(user.email || "").slice(0, 100),
      m_payment_id: paymentId,
      amount: "200.00",
      item_name: `CarScoutZA Featured Vehicle - 7 Days: ${vehicleTitle}`.slice(0, 100),
    };
    fields.signature = signature(Object.entries(fields), passphrase);

    const sandbox = (Deno.env.get("PAYFAST_MODE") || "sandbox").toLowerCase() !== "live";
    return json({
      action_url: sandbox
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process",
      fields,
      internal_reference: internalReference,
    }, 200, cors);
  } catch (error) {
    console.error("Featured checkout creation failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Secure featured checkout could not be created. No payment has been taken." }, 500, cors);
  }
});
