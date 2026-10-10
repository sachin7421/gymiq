// GymIQ — Apple Health ingest.
//
// Called by an iOS Shortcuts automation (no JWT available there), so auth is
// a per-user token from public.ingest_tokens. The token can arrive as the
// `?token=` query param (simplest for Shortcuts — the app hands the user one
// ready-made link), the `x-ingest-token` header, or `token` in the JSON body.
//
// Minimal body:   { steps: 8532 }           -> today's steps (date defaults
//                                              to "today" in the user's tz)
// Full body:      { date, steps, activeCalories?, sleepHours?, restingHr?, hrv? }
// Batch:          { days: [ {date, steps, ...}, ... ] }
// Health Auto Export app ("REST API" automation) payloads are also accepted:
//                 { data: { metrics: [ { name: 'step_count', data: [{date, qty}] } ] } }
//
// Timezone for "today": `?tz=` query param, body.tz, reminder_prefs.tz, else
// America/New_York. Only provided fields overwrite; other values for the day
// are kept. Deploy with verify_jwt = false (token auth is implemented here).

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
// A multi-line string of numbers (raw Health Samples pasted straight into the
// body without a Calculate Statistics step) is summed.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (Array.isArray(v)) {
    const parts = v.map(num).filter((x): x is number => x !== null);
    return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  }
  const s = String(v).replace(/,/g, "");
  const all = s.match(/-?\d+(\.\d+)?/g);
  if (!all) return null;
  if (all.length > 1 && /\n/.test(s)) return all.reduce((a, b) => a + Number(b), 0);
  return Number(all[0]);
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

function todayIn(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

type DayIn = Record<string, unknown>;

// Health Auto Export → our flat per-day shape.
function fromHealthAutoExport(body: Record<string, unknown>): DayIn[] | null {
  const metrics = (body.data as { metrics?: unknown[] } | undefined)?.metrics;
  if (!Array.isArray(metrics)) return null;
  const byDate: Record<string, DayIn> = {};
  const map: Record<string, string> = {
    step_count: "steps",
    active_energy: "activeCalories",
    resting_heart_rate: "restingHr",
    heart_rate_variability: "hrv",
  };
  for (const m of metrics as { name?: string; data?: { date?: string; qty?: number; asleep?: number }[] }[]) {
    const key = map[m.name || ""] || (m.name === "sleep_analysis" ? "sleepHours" : null);
    if (!key) continue;
    for (const pt of m.data || []) {
      const date = normDate(pt.date);
      if (!date) continue;
      byDate[date] ||= { date };
      const val = key === "sleepHours" ? pt.asleep : pt.qty;
      if (val == null) continue;
      // Multiple points in one day (hourly export) accumulate for counts.
      if (key === "steps" || key === "activeCalories") byDate[date][key] = (Number(byDate[date][key]) || 0) + Number(val);
      else byDate[date][key] = val;
    }
  }
  const days = Object.values(byDate);
  return days.length ? days : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = new URL(req.url);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json({ error: "invalid JSON body" }, 400);

  const token = url.searchParams.get("token") || req.headers.get("x-ingest-token") || body.token;
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

  // Resolve the user's timezone for "today" defaults.
  let tz = url.searchParams.get("tz") || (typeof body.tz === "string" ? body.tz : "");
  if (!tz) {
    const { data: prefs } = await sb.from("reminder_prefs").select("tz").eq("user_id", tok.user_id).maybeSingle();
    tz = prefs?.tz || "America/New_York";
  }
  const today = todayIn(tz);

  const days: DayIn[] = fromHealthAutoExport(body) || (Array.isArray(body.days) ? (body.days as DayIn[]) : [body]);
  const results: { date: string; steps: number | null }[] = [];

  for (const d of days) {
    const date = normDate(d.date) || today;
    const incoming: Record<string, number | null> = {
      steps: num(d.steps),
      active_calories: num(d.activeCalories ?? d.active_calories),
      sleep_hours: num(d.sleepHours ?? d.sleep_hours),
      resting_hr: num(d.restingHr ?? d.resting_hr),
      hrv: num(d.hrv),
    };
    if (Object.values(incoming).every((v) => v === null)) continue;

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
      source: String(d.source || (body.data ? "health-auto-export" : "shortcut")),
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

  if (results.length === 0) return json({ error: "no data — send at least { steps: <number> }" }, 400);
  return json({ ok: true, saved: results });
});
