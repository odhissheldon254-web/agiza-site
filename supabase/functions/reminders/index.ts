// Agiza Office reminder sender (Supabase Edge Function "reminders").
// POST -> sends every reminder that is due now. pg_cron calls it each minute (see reminders.sql).
// On first run it creates the push signing keys and publishes the public half in public.push_config,
// where the office reads it to register a phone.
// "Verify JWT" stays on; pg_cron sends the legacy anon key it keeps in Vault.
import postgres from "npm:postgres@3.4.5";
import webpush from "npm:web-push@3.6.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const cors = {
  "Access-Control-Allow-Origin": "https://agiza.odhis.co.ke",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const clock = (d: Date) =>
  d.toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", minute: "2-digit" });

async function vapidKeys() {
  let [k] = await sql`select public_key, private_key from private.vapid where id = 1`;
  if (!k) {
    const g = webpush.generateVAPIDKeys();
    await sql`insert into private.vapid (id, public_key, private_key)
              values (1, ${g.publicKey}, ${g.privateKey}) on conflict (id) do nothing`;
    [k] = await sql`select public_key, private_key from private.vapid where id = 1`;
    await sql`insert into public.push_config (id, public_key) values (1, ${k.public_key})
              on conflict (id) do update set public_key = excluded.public_key`;
  }
  return k;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const k = await vapidKeys();
    webpush.setVapidDetails("https://agiza.odhis.co.ke", k.public_key, k.private_key);

    // Claim due reminders in the same statement that marks them, so overlapping runs never double-send.
    // Anything more than two hours late is skipped rather than sent in a burst.
    const todos = await sql`
      update public.todos set reminded_at = now()
      where not done and reminded_at is null
        and remind_at <= now() and remind_at > now() - interval '2 hours'
      returning id, owner, text`;
    const meetings = await sql`
      update public.meetings set reminded_at = now()
      where reminded_at is null and remind_min > 0
        and starts_at - make_interval(mins => remind_min) <= now()
        and starts_at > now() - interval '15 minutes'
      returning id, owner, title, place, starts_at`;

    const notes = [
      ...todos.map((t) => ({ owner: t.owner, tag: "todo-" + t.id, title: "To-do", body: t.text })),
      ...meetings.map((m) => {
        const start = new Date(m.starts_at), mins = Math.round((start.getTime() - Date.now()) / 60000);
        return {
          owner: m.owner, tag: "meeting-" + m.id,
          title: m.title + (mins > 0 ? ` in ${mins} min` : " now"),
          body: clock(start) + (m.place ? " · " + m.place : ""),
        };
      }),
    ];

    let sent = 0;
    for (const n of notes) {
      const subs = await sql`select id, endpoint, p256dh, auth from public.push_subscriptions where owner = ${n.owner}`;
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: n.title, body: n.body, tag: n.tag }),
            { TTL: 3600 },
          );
          sent++;
        } catch (e) {
          // 404/410: the phone turned reminders off or the browser data was cleared.
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await sql`delete from public.push_subscriptions where id = ${s.id}`;
          else console.error("push failed", code, (e as Error).message);
        }
      }
    }
    return Response.json({ due: notes.length, sent }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "failed" }, { status: 500, headers: cors });
  }
});
