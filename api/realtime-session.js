// /api/realtime-session.js — Jimmy (EN), upbeat & persuasive, auto-replies, doc tool
export default async function handler(req, res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const FAST_FACTS = `
Offer & Pricing: Connected TV placements (e.g., YouTube on TVs). Pricing from 10¢ per airing; varies by market, inventory, time of day. No guarantees.
Coverage & Creative: National or local coverage; dayparts depend on inventory. Turnkey creative; launch can be ~72 hours after approval. QR codes supported; reporting includes runs, estimated views, dayparts, and QR scans.
Proof: Education center saw ~16,435 airings in ~30 days with a lead spike. Realtor got seller leads within days. Insurance agency's QR TV ad drove texts and direct inquiries. Restaurants saw orders within first week.
Process: Qualify → capture name + phone → propose plan → offer 10–30 minute discovery call (https://cal.com/amkhan/30min).
Compliance: Respect do-not-contact; avoid sensitive data; use contact info only for service follow-up.
`.trim();

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "echo",
        modalities: ["audio","text"],
        turn_detection: {
          type: "server_vad",
          threshold: 0.35,
          prefix_padding_ms: 220,
          silence_duration_ms: 240,
          create_response: true,
          interrupt_response: true
        },
        temperature: 0.85,
        max_response_output_tokens: 500,
        instructions: `
You are **Jimmy**, the voice concierge for Easy TV Offers.
Speak only English (US). Never mention internal codenames; say "our platform."

TONE & PACE
- Friendly, energetic, confident. Speak ~10–15% faster than neutral.
- Short sentences (8–16 words). One question per turn. Be interruptible.

CORE FACTS (summarize naturally if asked):
${FAST_FACTS}

SALES FLOW
- Diagnose: industry, locations, budget, prior TV/radio.
- Benefit → proof → question. Use brief proof from our facts or docs.
- Pricing language: "from 10¢ per airing." Never promise results.
- Close: "Would a quick 10-minute discovery call help tailor a plan?"
  Offer two windows ("today or tomorrow?"); otherwise share the Cal link.

DOCS USE
- If a question needs specifics beyond the core facts, call **searchDocs(query)**.
- Do not announce you are searching. Keep talking naturally and answer succinctly.
        `,
        tools: [
          {
            type: "function",
            name: "searchDocs",
            description: "Search Easy TV documents for short factual snippets (top 3).",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Short search like 'reporting details', 'onboarding steps', 'case study restaurant'." }
              },
              required: ["query"]
            }
          },
          {
            type: "function",
            name: "createLead",
            description: "Save the lead (name, phone, email, notes).",
            parameters: {
              type: "object",
              properties: {
                name:  { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                notes: { type: "string" }
              },
              required: ["name","phone"]
            }
          },
          {
            type: "function",
            name: "bookCall",
            description: "Share booking link or confirm a time.",
            parameters: {
              type: "object",
              properties: {
                isoDatetime:  { type: "string", description: "ISO 8601 if the user gave a time" },
                durationMins: { type: "number", default: 15 }
              }
            }
          }
        ]
      })
    });

    if (!r.ok) return res.status(500).send(await r.text());
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
