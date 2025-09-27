// Simple Knowledge Base API for EZTV Voice
// Edit ARTICLES to include your real facts / playbooks

const ARTICLES = [
  {
    title: "Offer basics",
    tags: ["pricing","cost","rates","offer","10 cents","ten cents"],
    content: `
We buy TV/radio airings. Pricing starts **from 10¢ per airing**; actual rates vary by market, inventory and time of day.
We do not guarantee results. We propose a plan after a short discovery call.
    `.trim()
  },
  {
    title: "Discovery flow",
    tags: ["process","how it works","call","booking","cal.com"],
    content: `
Quick path: greet → qualify (industry, location, budget) → capture name & phone (email optional) → offer a 10-min discovery call.
Calls are booked at: https://cal.com/amkhan/30min
    `.trim()
  },
  {
    title: "Coverage & targeting",
    tags: ["coverage","targeting","national","local","geo"],
    content: `
We can place **national** or **local** airings. Targeting and dayparts depend on channel and inventory availability.
    `.trim()
  },
  {
    title: "Compliance",
    tags: ["consent","privacy","do not call","dncl","security"],
    content: `
We honor do-not-call. Do not collect sensitive data. Use contact info only to follow up about services.
    `.trim()
  },
  {
    title: "FAQ: results & measurement",
    tags: ["results","roi","attribution","performance"],
    content: `
Results vary by creative, market and spend. We discuss expectations and measurement approach on the discovery call.
    `.trim()
  },
  {
    title: "Lead capture rules",
    tags: ["lead","contact","phone","email"],
    content: `
**Required:** name + phone. **Optional:** email. Confirm back briefly (mask phone like (XXX) XXX-1234).
If user declines, offer booking link and end politely.
    `.trim()
  }
];

// --- tiny search helper ---
function searchKB(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = ARTICLES.map(a => {
    const text = (a.title + " " + a.tags.join(" ") + " " + a.content).toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (text.includes(t)) score += 2;
    }
    for (const t of a.tags) {
      if (q.includes(t.toLowerCase())) score += 3;
    }
    if (a.title.toLowerCase().includes(q)) score += 5;
    return { a, score };
  }).filter(x => x.score > 0)
    .sort((x,y)=> y.score - x.score)
    .slice(0, 3)
    .map(x => ({
      title: x.a.title,
      content: x.a.content
    }));
  return scored;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*"); // later: lock to your domain
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const query = (req.query?.query || req.query?.q || "").toString();
  if (!query) return res.status(400).json({ ok:false, error:"Missing ?query=" });

  const results = searchKB(query);
  return res.status(200).json({ ok:true, count: results.length, results });
}
