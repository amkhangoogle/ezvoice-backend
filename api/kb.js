// Simple Knowledge Base API for EZTV Voice (brand-sanitized)
// ✅ Paste as: api/kb.js

// === Edit/expand these facts anytime (no internal codenames) ===
const ARTICLES = [
  // ─────────── EasyTVOFFERS (core) ───────────
  {
    title: "Offer basics",
    tags: ["pricing","cost","rates","10 cents","ten cents","airing","budget"],
    content: `
We place ads on living-room TV via Connected TV (e.g., YouTube on TVs).
Pricing starts from **10¢ per airing**; actual rates vary by market, channel inventory, and time-of-day.
We don't guarantee specific results; we propose a plan after a short discovery call.
    `.trim()
  },
  {
    title: "Channels & coverage",
    tags: ["CTV","connected tv","youtube tv","living room","national","local","coverage","dayparts"],
    content: `
Primary channel is YouTube on Connected TV (living-room screens). Placements can be national or local.
Targeting and dayparts depend on inventory availability for selected markets.
    `.trim()
  },
  {
    title: "Turnkey creative & speed",
    tags: ["creative","script","voiceover","editing","turnkey","72 hours","launch"],
    content: `
We offer a turnkey infomercial workflow: offer scripting, pro voiceover, and editing.
Typical turnaround can be as fast as ~72 hours once assets are approved.
    `.trim()
  },
  {
    title: "QR codes & interactivity",
    tags: ["qr","scan","promo","directions","coupon","engagement"],
    content: `
We can embed QR codes in the TV spot for instant actions like special offers, discounts, directions, or opt-ins.
    `.trim()
  },
  {
    title: "Reporting",
    tags: ["reporting","analytics","metrics","views","time slots","scans","engagement"],
    content: `
We provide real-time reporting: when your ads ran, estimated views, dayparts/time slots, and QR-code scans.
Use this data to optimize creative and placements.
    `.trim()
  },
  {
    title: "Process summary",
    tags: ["process","how it works","flow","steps","onboarding"],
    content: `
Greet → qualify (industry, location, budget) → capture **name + phone** (email optional) → propose plan → offer a 10–30 min discovery call.
    `.trim()
  },
  {
    title: "Lead capture rules",
    tags: ["lead","contact","phone","email","forms","consent"],
    content: `
**Required:** name + phone. **Optional:** email. Confirm back briefly (mask phone like (XXX) XXX-1234).
If the user declines, offer the booking link and end politely.
    `.trim()
  },
  {
    title: "Compliance",
    tags: ["compliance","privacy","do not call","dncl","sensitive"],
    content: `
Honor do-not-contact requests. Don't collect sensitive data. Use contact info only for service follow-up.
    `.trim()
  },

  // ─────────── Proof (Case studies & Testimonials) ───────────
  {
    title: "Case studies (highlights)",
    tags: ["case study","proof","examples","results"],
    content: `
• Mathnasium (Macomb, MI): ~16k+ TV airings in ~30 days; owner reported a noticeable lead spike.
• Real Estate Agent: ran two campaigns (buyers & sellers); saw new opt-ins and seller leads within days.
• Michigan Insurance Agency: TV commercial with QR code drove SMS texts and direct inquiries.
• Amar Pizza: first week produced a mix of calls, SMS, and orders.
• Halal Food Junkies (influencer): IG reel repurposed for TV; scans & engagement spiked in days.
• Amy’s Unique Bridal Stages: new bridal leads within weeks.
    `.trim()
  },
  {
    title: "Testimonials (selected)",
    tags: ["testimonial","reviews","social proof"],
    content: `
• Finjan Café: traffic boost soon after opening.
• Avenue Hotel (UK): hundreds of inquiries; 27 event bookings worth thousands each.
• Skin by Kat (spa): ~65% clientele growth in 30 days; moved away from deep-discount sites.
• Gyro Boys (TX): customers reported “we saw you on TV” within the first week.
    `.trim()
  },

  // ─────────── Booking ───────────
  {
    title: "Discovery booking",
    tags: ["booking","cal.com","meeting","schedule","link"],
    content: `
Use this link to schedule a 10–30 minute discovery call:
https://cal.com/amkhan/30min
    `.trim()
  },

  // ─────────── Our platform (codename-free) ───────────
  {
    title: "Our platform: overview",
    tags: ["platform","overview","product","service"],
    content: `
Our platform helps businesses place TV/radio-style airings across living-room screens with simple setup and transparent reports.
Typical users are local businesses and agencies; the outcome is predictable placement with clear metrics.
    `.trim()
  },
  {
    title: "Our platform: pricing & plans",
    tags: ["platform","pricing","plans","cost"],
    content: `
Pricing is straightforward and proposal-based for your markets and dayparts.
For TV/radio placements, pricing still starts **from 10¢ per airing**, varying by market and time.
    `.trim()
  },
  {
    title: "Our platform: onboarding",
    tags: ["platform","onboarding","setup","start","process"],
    content: `
1) Discovery → 2) Access & assets → 3) Creative/placements plan → 4) Launch.
Typical turnaround can be ~3–5 business days after assets are approved.
    `.trim()
  },
  {
    title: "Our platform: targeting & channels",
    tags: ["platform","channels","coverage","targeting","inventory"],
    content: `
Supports Connected TV and related inventory; national + local coverage.
Targeting depends on market inventory and dayparts for selected geos.
    `.trim()
  },
  {
    title: "Our platform: measurement & expectations",
    tags: ["platform","results","roi","kpi","measurement","attribution"],
    content: `
No guaranteed outcomes. Typical KPIs: leads, calls, site visits, or QR scans.
We align expectations during the discovery call and tailor the plan to budget and market.
    `.trim()
  }
];

// ——— query normalization so if someone says the old codename, we answer generically ———
function normalizeQuery(q) {
  const s = (q || "").toLowerCase();
  return s.replace(/\bnedzo\b/g, "platform"); // map the codename to neutral concept
}

// ——— tiny search helper ———
function searchKB(query) {
  const q = normalizeQuery(query).trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = ARTICLES.map(a => {
    const text = (a.title + " " + a.tags.join(" ") + " " + a.content).toLowerCase();
    let score = 0;
    for (const t of terms) if (text.includes(t)) score += 2;
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
  // CORS (loosen or lock as you wish)
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
