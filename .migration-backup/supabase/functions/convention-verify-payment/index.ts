import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { transaction_id, tx_ref } = await req.json();
    if (!transaction_id || !tx_ref) {
      return new Response(JSON.stringify({ error: "transaction_id and tx_ref required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);
    const { data: reg, error: regErr } = await admin.from("convention_registrations").select("*").eq("tx_ref", tx_ref).maybeSingle();
    if (regErr || !reg) return new Response(JSON.stringify({ error: "Registration not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reg.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Server-side authoritative price map (NGN). Never trust client/DB amount.
    const BASE_PRICES: Record<string, number> = {
      student: 20000,
      graduate: 30000,
      delegate: 15000, // legacy
      chapter: 50000,
    };
    const STUDENT_DISCOUNT_PRICE = 15000;
    const DISCOUNT_START = new Date("2026-06-16T00:00:00Z").getTime();
    const DISCOUNT_END = new Date("2026-07-31T23:59:59Z").getTime();

    let expectedAmount = BASE_PRICES[reg.registration_type as string] || 0;
    if (reg.registration_type === "student" && reg.created_at) {
      const createdAt = new Date(reg.created_at).getTime();
      if (createdAt >= DISCOUNT_START && createdAt <= DISCOUNT_END) {
        expectedAmount = STUDENT_DISCOUNT_PRICE;
      }
    }
    if (!expectedAmount) {
      return new Response(JSON.stringify({ error: "Invalid registration type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch Flutterwave secret key from app_settings
    const { data: setting } = await admin.from("app_settings").select("value").eq("key", "flutterwave").maybeSingle();
    const fwSecret = (setting?.value as any)?.secret_key;
    if (!fwSecret) return new Response(JSON.stringify({ error: "Flutterwave not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${fwSecret}` },
    });
    const verifyJson = await verifyRes.json();
    const data = verifyJson?.data;

    const successful =
      data?.status === "successful" &&
      data?.tx_ref === tx_ref &&
      (data?.currency ?? "NGN") === "NGN" &&
      Number(data?.amount) >= expectedAmount;
    const newStatus = successful ? "successful" : "failed";

    await admin.from("convention_registrations").update({
      payment_status: newStatus,
      flw_transaction_id: String(transaction_id),
      amount: expectedAmount,
    }).eq("id", reg.id);

    return new Response(JSON.stringify({ success: successful, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});