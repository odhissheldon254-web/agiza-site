// Agiza Office news collector (Supabase Edge Function "news").
// pg_cron calls it every 3 hours (see news.sql). It reads Kenyan insurance headlines from
// Google News (or Bing News), keeps the relevant ones in public.news (headline, source and link only),
// and drops anything older than three weeks. The office shows the latest few.
// "Verify JWT" stays on; pg_cron sends the legacy anon key it keeps in Vault.
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
// Google News first; Bing News if Google refuses (it sometimes blocks cloud servers).
const FEEDS = [
  { url: "https://news.google.com/rss/search?q=" +
      encodeURIComponent('(insurance OR assurance OR "life cover" OR insurer OR IRA) Kenya when:7d') + "&hl=en-KE&gl=KE&ceid=KE:en",
    sourceTag: "source" },
  { url: "https://www.bing.com/news/search?q=" + encodeURIComponent("insurance Kenya") + "&format=rss&mkt=en-KE",
    sourceTag: "News:Source" },
];
// Only headlines that are really about insurance make it to her office.
const RELEVANT = /insur|assur|underwrit|policyholder|premium|actuar|pension|takaful|\bIRA\b|prudential|life cover|claims?/i;

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
};

// Bing wraps each link in a click-tracker; the real article address is its "url" parameter.
const realLink = (link: string) => {
  try {
    const u = new URL(link);
    return u.hostname.endsWith("bing.com") && u.searchParams.get("url") ? u.searchParams.get("url")! : link;
  } catch {
    return link;
  }
};
const parse = (xml: string, sourceTag: string) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const source = tag(m[1], sourceTag);
    // Google appends " - Source" to each title; the source is shown separately.
    let title = tag(m[1], "title");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    const date = new Date(tag(m[1], "pubDate"));
    return { title, link: realLink(tag(m[1], "link")), source, published_at: isNaN(+date) ? null : date.toISOString() };
  }).filter((n) => n.title && n.link && RELEVANT.test(n.title)).slice(0, 15);

Deno.serve(async () => {
  try {
    let items: { title: string; link: string; source: string; published_at: string | null }[] = [];
    for (const feed of FEEDS) {
      try {
        const res = await fetch(feed.url, { headers: { "User-Agent": "AgizaOffice/1.0 (+https://agiza.odhis.co.ke)" } });
        if (!res.ok) { console.error("feed", res.status, feed.url); continue; }
        items = parse(await res.text(), feed.sourceTag);
        if (items.length) break;
      } catch (e) {
        console.error("feed", (e as Error).message, feed.url);
      }
    }
    if (!items.length) throw new Error("no feed answered");

    for (const n of items) {
      await sql`insert into public.news (link, title, source, published_at)
                values (${n.link}, ${n.title}, ${n.source}, ${n.published_at})
                on conflict (link) do update set title = excluded.title, fetched_at = now()`;
    }
    await sql`delete from public.news where coalesce(published_at, fetched_at) < now() - interval '21 days'`;
    return Response.json({ kept: items.length });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "failed" }, { status: 500 });
  }
});
