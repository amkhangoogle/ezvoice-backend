// api/realtime-session.js — strict guard, EN-only, voice=echo
export default async function handler(req, res) {
  // --- CORS (allow-list) ---
  const allowed = new Set([
    "https://easytvoffers.com",
    "https://www.easytvoffers.com",
    // add staging/preview origins here if needed, e.g.:
    // "https://preview.pagemaker.io"
  ]);
  const origin = req.headers.origin || "";
  const isAllowed = allowed.has(origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  // ------------------------------------------

  if (req.method !== "GET") return res.status(405).end();

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "echo",                 // requested voice
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 250,
          silence_duration_ms: 300,
          create_response: true       // auto-greet on connect
        },
        instructions: `
You are EZTV Voice for Easy TV Offers.

LANGUAGE
- Speak **only in English (US)** unless the visitor explicitly asks for another language.
- If the visitor uses another language once, politely ask if they'd like to continue in that language. If not, stay in English.

STRICT BRAND GUARD
- **Never mention or repeat internal codenames** (old project names).
- If the visitor says one, do NOT repeat it. Use neutral wording like "**our platform**" instead.

STYLE & BEHAVIOR
- Short, natural sentences (8–16 words). One question per turn.
- Stop speaking the moment the visitor starts talking (be interruptible).
- Pricing phrasing must be: **"from 10¢ per airing."** Never promise results.

KNOWLEDGE-FIRST ANSWERS
- Before answering about pricing, process, coverage/targeting, compliance, results/measurement, or FAQs:
  1) Call **searchKB(query)** with a short keyword (e.g., "pricing", "process", "coverage").
  2) Prefer facts returned by the tool. If no match, answer briefly and offer to clarify.

LEAD & BOOKING FLOW
- Ask concise qualifying questions (industry, locations, budget, prior TV/radio).
- Capture **name + phone** (email optional). Confirm back briefly (mask phone like (XXX) XXX-1234).
- Offer a 10–30 minute discovery call and book if they provide a time; otherwise share the booking link.
        `,
        tools: [
          {
            type: "function",
            name: "createLead",
            description: "Save a lead in the website CRM",
            parameters: {
              type: "object",
              properties: {
                name:  { type: "string", description: "Full name" },
                email: { type: "string" },
                phone: { type: "string", description: "E.164 if possible; assume +1 if not provided" },
                notes: { type: "string", description: "One-sentence summary: industry, location, budget, next step" }
              },
              required: ["name", "phone"]
            }
          },
          {
            type: "function",
            name: "bookCall",
            description: "Book a discovery call on Cal.com",
            parameters: {
              type: "object",
              properties: {
                isoDatetime:  { type: "string", description: "ISO 8601 start time inferred from user phrase" },
                durationMins: { type: "number", default: 15 }
              },
              required: ["isoDatetime"]
            }
          },
          {
            type: "function",
            name: "searchKB",
            description: "Look up short, factual snippets from the EZTV knowledge base",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Short search like 'pricing', 'process', 'coverage', 'compliance', 'results'." }
              },
              required: ["query"]
            }
          }
        ]
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).send(text);
    }
    const session = await r.json();
    return res.status(200).json(session);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
