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
4. **Authentication, Users, Add user, Create new user:** enter Agiza's email and tick "Auto confirm". (No password needed.)
5. **Authentication, Emails, Magic Link template:** add `Your sign-in code: {{ .Token }}` to the message, so the email contains the 6-digit code.
6. **Authentication, URL Configuration:** set Site URL to `https://agiza.odhis.co.ke/office/`.
7. **Project Settings, API:** copy the Project URL and the `anon` public key into `office/config.js`, then push.

Supabase's free built-in email only sends to members of your Supabase team, a few times an hour. Invite Agiza's email under Organization, Team (or create the account with her email). She stays signed in on her phone, so she rarely needs a new code.
