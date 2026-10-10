// Daily motivational line — deterministic per date so the dashboard and the
// morning push notification agree. Keep in sync with
// supabase/functions/send-reminders/index.ts QUOTES.

export const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  "You don't have to be extreme, just consistent.",
  'The body achieves what the mind believes.',
  "Strength doesn't come from what you can do. It comes from overcoming what you once couldn't.",
  'Motivation gets you started. Habit keeps you going.',
  'One workout at a time. One rep at a time.',
  'Your future self is watching you right now through memories.',
  'Sweat is just fat crying.',
  'The hardest lift of all is lifting yourself out of bed.',
  "A year from now you'll wish you had started today.",
  "Don't count the days. Make the days count.",
  'Small daily improvements are the key to staggering long-term results.',
  "You're one workout away from a good mood.",
  'Nothing changes if nothing changes.',
  'Fall in love with the process and the results will come.',
  "Take care of your body. It's the only place you have to live.",
  'The pain you feel today will be the strength you feel tomorrow.',
  'It never gets easier. You just get stronger.',
  'Energy and persistence conquer all things.',
  "Show up. Especially on the days you don't feel like it.",
  'What you do today can improve all your tomorrows.',
]

export function quoteFor(dateStr) {
  let h = 0
  for (const c of dateStr) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return QUOTES[h % QUOTES.length]
}
