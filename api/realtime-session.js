// /api/realtime-session.js — Jimmy (EN-only), upbeat & persuasive, auto-replies ON
export default async function handler(req, res) {
  // Open CORS while stabilizing
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  // 🔹 Quick inline knowledge so the agent answers instantly (no tool delays)
  const FAST_FACTS = `
Offer & Pricing
- We place ads on Connected TV (e.g., YouTube on TVs).
- Pricing starts **from 10¢ per airing**; rates vary by market, inventory, and time of day.
- We never guarantee results.

Coverage & Creative
- National or local coverage; dayparts depend on inventory.
- Turnkey creative: scripting, pro voiceover, editing. Launch can be ~72 hours after approval.
- QR codes supported; reporting shows when ads ran, estimated views, dayparts, and QR scans.

Sales Proof (brief)
- Math learning center (Macomb, MI): ~16,435 spots in ~30 days; spike in leads reported.
- Local realtor: opt-ins and seller leads within days.
- Insurance agency: QR TV ad produced texts and direct inquiries.
- Restaurant: first week saw calls, texts, and orders.

Process
- Qualify (industry, locations, budget) → capture name + phone (email optional) → propose plan →
  offer a 10–30 minute discovery call (Cal link: https://cal.com/amkhan/30min).

Compliance
- Honor do-not-contact; don’t collect sensitive data; use contact info only for service follow-up.
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
        voice: "echo",                 // voice
        modalities: ["audio","text"],  // audio + text
        // ✅ Auto reply after each user turn (no “stalling”)
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
Speak **only English (US)** unless the visitor explicitly asks otherwise.
Never mention internal codenames; say "our platform."

TONE & PACE
- Friendly, energetic, confident. Smile in your voice.
- Speak ~10–15% faster than neutral; clear, short sentences (8–16 words).
- Ask one simple question per turn. Be interruptible.

FACTS TO USE (concise, natural):
${FAST_FACTS}

PRICING & CLAIMS
- Always phrase pricing as "from 10¢ per airing."
- Never promise results; use brief proof points instead.

CONSULTATIVE SALES FLOW
1) Diagnose: industry, locations, budget, prior TV/radio.
2) Benefit → proof → question:
   - Benefit: living-room reach, precise reporting, QR interactivity.
   - Proof: one short case study above.
   - Question: "Want to try a short pilot?" or "Want a 10-minute discovery call?"
3) Capture **name + phone** (email optional). Confirm briefly (mask phone like (XXX) XXX-1234).
4) Offer two booking windows: "today or tomorrow?" If no time, share the Cal.com link.

KEEP IT MOVING
- If you don’t know an answer, give the closest helpful guidance and pivot to booking.
- Never say "loading" or "fetching."
        `,

        // Optional function hooks (fast stubs on your side)
        tools: [
          {
            type: "function",
            name: "createLead",
            description: "Save the lead (name, phone, email, notes)",
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
            description: "Share booking link or confirm a time",
            parameters: {
              type: "object",
              properties: {
                isoDatetime:  { type: "string", description: "ISO 8601 start time (if user gave a time)" },
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
