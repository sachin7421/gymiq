// GymIQ — Apple Health ingest.
//
// Called by an iOS Shortcuts automation (no JWT available there), so auth is
// a per-user token from public.ingest_tokens, sent as the `x-ingest-token`
// header or `token` in the JSON body. Accepts one day or an array of days:
//   { token, date: 'YYYY-MM-DD', steps, activeCalories?, sleepHours?, restingHr?, hrv? }
//   { token, days: [ {date, steps, ...}, ... ] }
// Only provided fields are overwritten; existing values for the day are kept.
//
// Deploy with verify_jwt = false (token auth is implemented here).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// "8,532", "8532 count", 8532.0 -> 8532 ; null/"" -> null
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// Accept 'YYYY-MM-DD', ISO datetimes, or 'MM/DD/YYYY' (Shortcuts default US format).
function normDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "invalid JSON body" }, 400);

  const token = req.headers.get("x-ingest-token") || body.token;
  if (!token || typeof token !== "string") return json({ error: "missing token" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tok, error: tokErr } = await sb
    .from("ingest_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (tokErr) return json({ error: tokErr.message }, 500);
  if (!tok) return json({ error: "invalid token" }, 401);

  const days: Record<string, unknown>[] = Array.isArray(body.days) ? body.days : [body];
  const results: { date: string; steps: number | null }[] = [];

  for (const d of days) {
    const date = normDate(d.date);
    if (!date) continue;
    const incoming: Record<string, number | null> = {
      steps: num(d.steps),
      active_calories: num(d.activeCalories ?? d.active_calories),
      sleep_hours: num(d.sleepHours ?? d.sleep_hours),
      resting_hr: num(d.restingHr ?? d.resting_hr),
      hrv: num(d.hrv),
    };

    // Merge with the existing row so a steps-only post doesn't wipe sleep, etc.
    const { data: existing } = await sb
      .from("health_daily")
      .select("steps, active_calories, sleep_hours, resting_hr, hrv")
      .eq("user_id", tok.user_id)
      .eq("date", date)
      .maybeSingle();

    const row: Record<string, unknown> = {
      user_id: tok.user_id,
      date,
      source: String(d.source || "shortcut"),
      updated_at: new Date().toISOString(),
    };
    for (const k of Object.keys(incoming)) {
      const v = incoming[k];
      row[k] = v !== null ? v : (existing ? (existing as Record<string, unknown>)[k] : null);
    }
    // Steps only ever go up within a day (a later sync has the fuller count).
    if (existing?.steps != null && row.steps != null && (row.steps as number) < (existing.steps as number)) {
      row.steps = existing.steps;
    }

    const { error: upErr } = await sb.from("health_daily").upsert(row, { onConflict: "user_id,date" });
    if (upErr) return json({ error: upErr.message }, 500);
    results.push({ date, steps: row.steps as number | null });
  }

  if (results.length === 0) return json({ error: "no valid days (need date as YYYY-MM-DD)" }, 400);
  return json({ ok: true, saved: results });
});
