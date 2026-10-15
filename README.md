# agiza.co.ke

Agiza's personal website: one page, plain HTML, hosted free on Cloudflare Pages. The domain is the only cost.

## 1. Fill in her details (find and replace in index.html)

| Placeholder | Replace with | Example |
|---|---|---|
| `[Surname]` | Her surname | Wanjiku |
| `2547XXXXXXXX` | WhatsApp number, international format, no + or spaces | 254712345678 |
| `07XX XXX XXX` | Same number, the way Kenyans write it | 0712 345 678 |
| `[XXXX]` | Her IRA licence number | |
| `[Insurer name]` | The company she is an agent for, worded the way they approve | |
| `Nairobi` | Her town, if it is not Nairobi (appears 4 times) | |

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
