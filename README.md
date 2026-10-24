# agiza.co.ke

Agiza's personal website: one page, plain HTML, hosted free on Cloudflare Pages. The domain is the only cost.

## 1. Fill in her details (find and replace in index.html)

| Placeholder | Replace with | Example |
|---|---|---|
| `[XXXX]` | Her IRA licence number | |
| `Nairobi` | Her town, if it is not Nairobi (appears 4 times) | |

The "Ask Agiza" chat bubble (bottom right) has its own copy of the number (now 254111349220, from her Prudential quote): change `const WHATSAPP` near the end of `index.html`.
Its six replies are fixed text, listed together in the `QA` list just below that line. Have Agiza read them and approve every word before going live.

Then add her photo as `images/agiza.jpg`: a portrait, about 800 x 1000 pixels, under 300 KB.
Until the photo is there, the page shows a soft pink placeholder.

## 2. Put it online (free)

1. Create a free GitHub account and a repository called `agiza-site`, then push this folder to it.
2. Create a free Cloudflare account. Go to Workers & Pages, then Create, then Pages, then Connect to Git, and pick `agiza-site`.
   Build settings: framework **None**, build command **empty**, output directory **/** .
3. The site is now live at `agiza-site.pages.dev`. Every push updates it.

## 3. Connect agiza.co.ke

1. Buy `agiza.co.ke` (Truehost or HostPinnacle), domain only, registered in Agiza's name.
2. In Cloudflare, Add a site, then enter `agiza.co.ke` on the Free plan. Cloudflare shows two nameservers.
3. In the registrar dashboard, replace the nameservers with Cloudflare's two. This can take a few hours.
4. In Cloudflare Pages, open the project, then Custom domains, then add `agiza.co.ke` and `www.agiza.co.ke`.

## 4. Email and Google

- **Email:** Cloudflare, Email, Email Routing. Forward `agiza@agiza.co.ke` to her Gmail. Free.
- **Google Search Console:** add `agiza.co.ke`, then submit `https://agiza.co.ke/sitemap.xml`.
- **Google Business Profile:** create one for her with the website link, so she shows up on Maps.
- **Campaign material:** print `agiza.co.ke` and a QR code to it on posters and flyers.

## 5. Agiza's office (agiza.odhis.co.ke/office/)

The office saves to a free Supabase database. Until `office/config.js` is filled in, it runs as a demo with sample data.

1. Sign up at supabase.com, create a project (free plan, region closest to Kenya), and save the database password somewhere safe.
2. **SQL Editor, New query:** paste all of `supabase/setup.sql`, then Run. This creates her tables, the private PDF folder and the locks.
3. **Authentication, Sign In / Providers:** under Email, keep it enabled and switch **"Allow new users to sign up" OFF**.
4. **Authentication, Users, Add user, Create new user:** enter Agiza's email, a password of at least 8 characters, and tick "Auto confirm". Give her the password privately.
5. **Authentication, Sign In / Providers, Email:** set the minimum password length to 8.
6. **Authentication, URL Configuration:** set Site URL to `https://agiza.odhis.co.ke/office/`.
7. **Project Settings, API Keys:** copy the Project URL and the publishable key into `office/config.js`, then push.

She signs in with her email and password and stays signed in on her phone. If she forgets the password, "Email me a reset link" on the sign-in page sends her a link that opens a "Choose a new password" screen. Supabase's free built-in email only reaches members of the Supabase team (she owns the project, so it reaches her), a few times an hour.

### Phone reminders

To-dos can carry a "Remind me at" time, and meetings remind 30 minutes before (changeable per meeting). Agiza taps **Turn on reminders** in the office once per phone. On iPhone she must first add the office to her Home Screen and open it from there.

Setup, already done for her project:
1. **SQL Editor:** run `supabase/reminders.sql`, after storing the legacy anon key in Vault as the file explains.
2. **Edge Functions:** deploy `supabase/functions/reminders/index.ts` as a function named `reminders`, keeping "Verify JWT" on.

pg_cron calls the function every minute. On its first run it creates the push keys and publishes the public half in `push_config`.

### Agiza Assistant, mood card and news

- **Agiza Assistant:** the "✨ Ask Agiza" button opens a helper. She can type or tap 🎤 to speak, for example "Remind me to call Wanjiru tomorrow at 10", "Meeting with Brian on Friday at 2pm at Sarit" or "What do I have today?". It understands simple English and some Swahili (kesho, leo, saa nne), and always shows a card to confirm before saving. It is rule-based and runs in the browser (`office/assistant.js`); no AI service is involved.
- **Mood card:** the greeting changes for morning, afternoon and evening, and comes with a daily encouragement and a "Did you know?" fact. Celebrations pop up when a client is covered, a quote is accepted or all to-dos are done. All the words live in `office/cheer.js` and can be edited freely.
- **Insurance news:** Kenyan insurance headlines (title, source and link only), collected every 3 hours by the `news` Edge Function. Setup: run `supabase/news.sql`, then deploy `supabase/functions/news/index.ts` as `news`, keeping "Verify JWT" on.

### Office layout (v2)

The office opens on **Home**, which shows only what needs her: today's motivation, the next meeting (with WhatsApp and Directions buttons), the "Needs you" list ranked by urgency, and three number tiles. A bottom bar (a left rail on wide screens) leads to Diary, Ask, Clients (People | Quotes) and To-dos. Reminders, the app, the chime, news and sign-out are under More, opened from her initial at the top.

Each kind of item has one colour, the same on every page: meetings plum, quotes amber, new clients teal, documents lilac, to-dos and finished items green. Red is used only for overdue items, and every colour comes with an icon or a word.

Code: `office/app.js` (data, pages, forms, reminders), `office/assistant.js` (helper, motivation, celebrations, news), `office/cheer.js` (all the words). `designs/office-v2/` is the same office running on sample data, for previews. When changing a script, bump its `?v=` number in `index.html`.
