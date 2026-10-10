// GymIQ — scheduled web-push reminders.
//
// Invoked every 15 minutes by pg_cron (via pg_net) with header
// `x-cron-secret` = app_config.cron_secret. For every user with reminder
// prefs + push subscriptions, compute their local wall-clock time and send:
//   • Morning: today's workout + a motivational line + creatine nudge.
//   • Evening: night-walk nudge based on live steps (Apple Health via the
//     ingest function) + magnesium nudge.
// Each is sent at most once per local day (last_*_sent columns).
//
// Also:
//   GET  ?vapid=1                 -> { publicKey }  (client needs it to subscribe)
//   POST { test: true } + user JWT -> sends a test push to that user's devices
//
// VAPID keys are generated on first run and stored in app_config, so the
// private key never leaves Supabase. Deploy with verify_jwt = false.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const VAPID_SUBJECT = "mailto:sachin8@gmail.com";
const STEPS_FLOOR = 8500;
const STEPS_TARGET = 10000;
const APP_URL = "https://sachin7421.github.io/gymiq/";

const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme, just consistent.",
  "The body achieves what the mind believes.",
  "Strength doesn't come from what you can do. It comes from overcoming what you once couldn't.",
  "Motivation gets you started. Habit keeps you going.",
  "One workout at a time. One rep at a time.",
  "Your future self is watching you right now through memories.",
  "Sweat is just fat crying.",
  "The hardest lift of all is lifting yourself out of bed.",
  "A year from now you'll wish you had started today.",
  "Don't count the days. Make the days count.",
  "Small daily improvements are the key to staggering long-term results.",
  "You're one workout away from a good mood.",
  "Nothing changes if nothing changes.",
  "Fall in love with the process and the results will come.",
  "Take care of your body. It's the only place you have to live.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "It never gets easier. You just get stronger.",
  "Energy and persistence conquer all things.",
  "Show up. Especially on the days you don't feel like it.",
  "What you do today can improve all your tomorrows.",
];

const GOAL_LABEL: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  hybrid: "Strength + Hike",
  cardio: "Cardio",
  mobility: "Mobility",
  recovery: "Recovery",
  rest: "Rest",
};
const FOCUS_LABEL: Record<string, string> = {
  push: "Push", pull: "Pull", lower: "Legs", upper: "Upper", full: "Full body",
};
const GOAL_ICON: Record<string, string> = {
  strength: "🏋️", hypertrophy: "💪", hybrid: "🥾", cardio: "🏃", mobility: "🤸", recovery: "🧘", rest: "😴",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getConfig(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from("app_config").select("key, value");
  const out: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string }) => { out[r.key] = r.value; });
  return out;
}

// Create VAPID keys once; afterwards they're read from app_config.
async function ensureVapid(sb: SupabaseClient, cfg: Record<string, string>) {
  if (cfg.vapid_public && cfg.vapid_private) return cfg;
  const keys = webpush.generateVAPIDKeys();
  await sb.from("app_config").upsert([
    { key: "vapid_public", value: keys.publicKey },
    { key: "vapid_private", value: keys.privateKey },
  ]);
  return { ...cfg, vapid_public: keys.publicKey, vapid_private: keys.privateKey };
}

// Local date 'YYYY-MM-DD', minutes since midnight, and 0..6 day-of-week in `tz`.
function localNow(tz: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const hour = Number(get("hour")) % 24;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date, minutes: hour * 60 + Number(get("minute")), dow };
}

function timeToMinutes(t: string) {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function quoteFor(date: string) {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return QUOTES[h % QUOTES.length];
}

function firstName(name?: string) {
  return (name || "").trim().split(/\s+/)[0] || "";
}

type Payload = { title: string; body: string; url?: string; tag?: string };

function morningPayload(data: Record<string, unknown>, dow: number, date: string): Payload {
  const name = firstName(data.userName as string);
  const dg = (data.dayGoals as Record<string, { goal: string; focus?: string }> | null)?.[String(dow)];
  const goal = dg?.goal || "rest";
  const label = goal === "rest" ? "Rest day" : `${GOAL_LABEL[goal] || goal}${dg?.focus ? ` · ${FOCUS_LABEL[dg.focus] || dg.focus}` : ""}`;
  const icon = GOAL_ICON[goal] || "💪";
  const title = `${icon} ${name ? `Morning, ${name} — ` : "Good morning — "}${label}`;
  const plan = goal === "rest"
    ? "Sleep, protein, and a walk are the work today."
    : goal === "hybrid"
    ? "20 min of lifts, 20 min incline hike, stretch."
    : goal === "cardio"
    ? "Conditioning day — get the heart rate up."
    : "Session is loaded in the app. Go earn it.";
  return {
    title,
    body: `${quoteFor(date)} ${plan} Creatine with water first ☀️`,
    url: APP_URL + (goal === "rest" ? "" : "#/workouts"),
    tag: "gymiq-morning",
  };
}

function eveningPayload(steps: number | null, name?: string): Payload {
  const n = steps ?? 0;
  const who = firstName(name);
  if (steps == null) {
    return {
      title: "🌙 Night walk time",
      body: `No step count synced yet today${who ? `, ${who}` : ""}. A 25-minute walk is ~2,500 steps — then magnesium and wind down.`,
      url: APP_URL, tag: "gymiq-evening",
    };
  }
  if (n >= STEPS_TARGET) {
    return {
      title: `✓ ${n.toLocaleString()} steps — target hit`,
      body: "Nice work. Magnesium, screens down, lights low. Sleep is where the gains land.",
      url: APP_URL, tag: "gymiq-evening",
    };
  }
  const gap = STEPS_TARGET - n;
  const mins = Math.max(10, Math.round(gap / 100)); // ~100 steps/min easy pace
  const floorNote = n < STEPS_FLOOR ? ` (below the ${STEPS_FLOOR.toLocaleString()} floor)` : "";
  return {
    title: `🚶 Night walk: ${n.toLocaleString()} steps so far${floorNote}`,
    body: `~${mins} min gets you to ${STEPS_TARGET.toLocaleString()}. Shoes on. Magnesium when you're back 🌙`,
    url: APP_URL, tag: "gymiq-evening",
  };
}

async function sendToUser(sb: SupabaseClient, userId: string, payload: Payload) {
  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 3600 },
      );
      sent++;
      await sb.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), fail_count: 0 }).eq("id", s.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await sb.from("push_subscriptions").delete().eq("id", s.id); // expired subscription
      } else {
        await sb.from("push_subscriptions").update({ fail_count: 1 }).eq("id", s.id);
      }
    }
  }
  return sent;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = admin();
  const url = new URL(req.url);
  let cfg = await getConfig(sb);
  cfg = await ensureVapid(sb, cfg);
  webpush.setVapidDetails(VAPID_SUBJECT, cfg.vapid_public, cfg.vapid_private);

  // Public key for client subscription — safe to expose.
  if (req.method === "GET" && url.searchParams.get("vapid")) {
    return json({ publicKey: cfg.vapid_public });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const body = await req.json().catch(() => ({}));

  // Test mode: a signed-in user asks for a push to their own devices.
  if (body?.test) {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "sign in required" }, 401);
    const { data: { user }, error } = await sb.auth.getUser(jwt);
    if (error || !user) return json({ error: "invalid session" }, 401);
    const { data: ud } = await sb.from("user_data").select("data").eq("id", user.id).maybeSingle();
    const data = (ud?.data || {}) as Record<string, unknown>;
    const { data: prefs } = await sb.from("reminder_prefs").select("tz").eq("user_id", user.id).maybeSingle();
    const { date, dow } = localNow(prefs?.tz || "America/New_York");
    const payload = body.kind === "evening"
      ? eveningPayload(await stepsFor(sb, user.id, date, data), data.userName as string)
      : body.kind === "morning"
      ? morningPayload(data, dow, date)
      : { title: "🔔 GymIQ notifications are on", body: `${quoteFor(date)}`, url: APP_URL, tag: "gymiq-test" };
    const sent = await sendToUser(sb, user.id, payload);
    return json({ ok: true, sent });
  }

  // Cron mode.
  if (req.headers.get("x-cron-secret") !== cfg.cron_secret) return json({ error: "forbidden" }, 403);

  const { data: prefsRows } = await sb.from("reminder_prefs").select("*");
  const report: Record<string, unknown>[] = [];
  for (const p of prefsRows || []) {
    const { date, minutes, dow } = localNow(p.tz || "America/New_York");
    const updates: Record<string, string> = {};

    // Send inside a 90-minute window after the scheduled time, once per day.
    const due = (enabled: boolean, t: string, last: string | null) => {
      if (!enabled || last === date) return false;
      const m = timeToMinutes(t);
      return minutes >= m && minutes < m + 90;
    };

    const { data: ud } = await sb.from("user_data").select("data").eq("id", p.user_id).maybeSingle();
    const data = (ud?.data || {}) as Record<string, unknown>;

    if (due(p.morning_enabled, p.morning_time, p.last_morning_sent)) {
      const sent = await sendToUser(sb, p.user_id, morningPayload(data, dow, date));
      updates.last_morning_sent = date;
      report.push({ user: p.user_id, kind: "morning", sent });
    }
    if (due(p.evening_enabled, p.evening_time, p.last_evening_sent)) {
      const steps = await stepsFor(sb, p.user_id, date, data);
      const sent = await sendToUser(sb, p.user_id, eveningPayload(steps, data.userName as string));
      updates.last_evening_sent = date;
      report.push({ user: p.user_id, kind: "evening", sent, steps });
    }
    if (Object.keys(updates).length) {
      await sb.from("reminder_prefs").update(updates).eq("user_id", p.user_id);
    }
  }
  return json({ ok: true, report });
});

// Today's steps: max of Apple Health sync (health_daily) and any manual entry in the blob.
async function stepsFor(sb: SupabaseClient, userId: string, date: string, data: Record<string, unknown>): Promise<number | null> {
  const { data: hd } = await sb.from("health_daily").select("steps").eq("user_id", userId).eq("date", date).maybeSingle();
  const auto = hd?.steps ?? null;
  const manual = (data.stepsLog as Record<string, number> | undefined)?.[date] ?? null;
  if (auto == null && manual == null) return null;
  return Math.max(auto ?? 0, manual ?? 0);
}
