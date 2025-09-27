// api/kb.js — EZTV Voice Knowledge Base (expanded, codename-free)

// ======= Curated facts from your docs/testimonials =======
const ARTICLES = [
  // ───────── Offer & Positioning ─────────
  {
    title: "Offer basics",
    tags: ["offer","pricing","cost","rates","10 cents","ten cents","airing","budget","ctv","connected tv","youtube tv"],
    content: `
We place ads on living-room TV via Connected TV (e.g., YouTube on TVs).
Pricing starts **from 10¢ per airing**; exact rates vary by market, inventory, and time of day.
We do not guarantee outcomes. We propose a plan after a short discovery call.
    `.trim()
  },
  {
    title: "Channels & coverage",
    tags: ["channels","coverage","national","local","targeting","dayparts","inventory"],
    content: `
Primary placements run on YouTube Connected TV (living-room screens). We support national and local coverage.
Targeting and dayparts depend on market inventory for selected geos.
    `.trim()
  },
  {
    title: "Creative & speed",
    tags: ["creative","script","voiceover","editing","turnkey","launch","72 hours"],
    content: `
Turnkey workflow: offer scripting, professional voiceover, and editing.
Typical launch can be ~72 hours after assets are approved.
    `.trim()
  },
  {
    title: "QR codes & reporting",
    tags: ["qr","scan","promo","offers","reporting","analytics","time slots","engagement"],
    content: `
Commercials can include QR codes for instant actions (offers, discounts, directions, opt-ins).
Reporting shows when ads ran, estimated views, dayparts/time slots, and QR scans.
    `.trim()
  },
  {
    title: "Process summary",
    tags: ["process","onboarding","steps","how it works","flow"],
    content: `
Greet → qualify (industry, locations, budget) → capture name + phone (email optional) → propose plan → offer a 10–30 minute discovery call.
    `.trim()
  },

  // ───────── Lead Handling & Compliance ─────────
  {
    title: "Lead capture rules",
    tags: ["lead","contact","phone","email","forms","consent","privacy"],
    content: `
Required: name + phone. Optional: email. Confirm back briefly (mask phone like (XXX) XXX-1234).
If the visitor declines sharing info, offer the booking link and end politely.
    `.trim()
  },
  {
    title: "Compliance",
    tags: ["compliance","privacy","do not call","dncl","sensitive"],
    content: `
Honor do-not-contact requests. Do not collect sensitive data. Use contact info only for service follow-up.
    `.trim()
  },

  // ───────── Case Studies (from your KB file) ─────────
  {
    title: "Case study: Math learning center (Macomb, MI)",
    tags: ["case study","education","mathnasium","lead spike"],
    content: `
~16,435 TV spots in ~30 days. Owner reported a noticeable spike in leads.
    `.trim()
  },
  {
    title: "Case study: Local realtor",
    tags: ["case study","real estate","buyers","sellers","opt-ins"],
    content: `
Two campaigns (buyers & sellers) generated website opt-ins and seller leads within days.
    `.trim()
  },
  {
    title: "Case study: Insurance agency",
    tags: ["case study","insurance","qr","inquiries","sms"],
    content: `
TV commercial with a QR code drove SMS texts and direct client inquiries.
    `.trim()
  },
  {
    title: "Case study: Restaurant",
    tags: ["case study","restaurant","orders","calls","sms"],
    content: `
First week produced a mix of calls, SMS, and orders (early momentum).
    `.trim()
  },

  // ───────── Testimonials (from your transcript highlights) ─────────
  {
    title: "Testimonials (selected)",
    tags: ["testimonial","reviews","social proof"],
    content: `
• Skin by Kat (spa): ~65% clientele growth in ~30 days; moved away from deep-discount sites.
• Avenue Hotel (UK): hundreds of enquiries; 27 confirmed bookings worth thousands each.
• Gyro Boys (TX): customers came in saying “we saw you on TV.”
• “Joe”: averaging 4–5 opt-ins per day; traffic is targeted and converting.
    `.trim()
  },

  // ───────── Booking ─────────
  {
    title: "Discovery booking",
    tags: ["booking","cal.com","schedule","meeting","discovery","link"],
    content: `
Use this link for a 10–30 minute discovery call: https://cal.com/amkhan/30min
    `.trim()
  },

  // ───────── Sales Playbook (objections & closes) ─────────
  {
    title: "Sales: objection handling",
    tags: ["sales","objections","price","budget","timing","convincing","close"],
    content: `
Common objections & brief responses:
• "Price/budget": We start from 10¢ per airing and tailor markets/dayparts to your budget.
• "Will it work?": It depends on creative and market; our case studies show momentum within days or weeks.
• "We tried TV before": CTV is precise and reportable (QR scans, dayparts, estimates) to guide optimization.
• "Not ready": No problem—let’s book a quick discovery to outline a right-sized pilot.
    `.trim()
  },
  {
    title: "Sales: recommended close",
    tags: ["sales","closing","next step","assumptive close","calendar"],
    content: `
Close with one clear question: 
"Would a quick 10-minute discovery call help tailor a plan for your market?"
If yes: ask "today or tomorrow?" and propose two time windows. If no: offer the booking link and a brief follow-up.
    `.trim()
  }
];

// —— tiny synonym guard: treat old codenames as “platform” ——
function normalizeQuery(q) {
  return (q || "").toLowerCase().replace(/\bnedzo\b/g, "platform");
}

// —— search helper ——
function searchKB(query) {
  const q = normalizeQuery(query).trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = ARTICLES.map(a => {
    const txt = (a.title + " " + a.tags.join(" ") + " " + a.content).toLowerCase();
    let score = 0;
    for (const t of terms) if (txt.includes(t)) score += 2;
    for (const t of a.tags) if (q.includes(t.toLowerCase())) score += 3;
    if (a.title.toLowerCase().includes(q)) score += 5;
    return { a, score };
  }).filter(x => x.score > 0)
    .sort((x,y)=> y.score - x.score)
    .slice(0, 3)
    .map(x => ({ title: x.a.title, content: x.a.content }));
  return scored;
}

export default async function handler(req, res) {
  // CORS (loosen during testing; lock later if desired)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const query = (req.query?.query || req.query?.q || "").toString();
  if (!query) return res.status(400).json({ ok:false, error:"Missing ?query=" });

  const results = searchKB(query);
  return res.status(200).json({ ok:true, count: results.length, results });
}
