// api/realtime-session.js — "Jimmy", EN-only, voice=echo, upbeat & slightly faster
export default async function handler(req, res) {
  // --- CORS (allow-list) ---
  const allowed = new Set([
    "https://easytvoffers.com",
    "https://www.easytvoffers.com",
    // add staging/preview origins here if needed:
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
        voice: "echo",                 // keep echo, we'll style it via instructions
        modalities: ["audio", "text"],
        // Manual greet from the widget; keep turn-taking snappy
        turn_detection: {
          type: "server_vad",
          threshold: 0.35,
          prefix_padding_ms: 220,
          silence_duration_ms: 240,
          create_response: false
        },
        instructions: `
You are **Jimmy**, the voice concierge for Easy TV Offers.

LANGUAGE & BRAND
- Speak ONLY in English (US) unless the visitor explicitly asks otherwise.
- Never mention or repeat internal codenames. If a visitor uses one, reply using "our platform" and do not repeat it.

DELIVERY (IMPORTANT – ENTHUSIASTIC & SLIGHTLY FASTER)
- Friendly, upbeat, confident tone. Natural energy—smile in your voice.
- Pace: about **10–15% faster** than normal, but keep diction clear.
- Vary pitch lightly to avoid sounding flat. Keep replies crisp and warm.

FIRST TURN
- The client triggers your first response (manual greet). Do NOT wait for the visitor to speak first.
- First line: one short greeting + one quick permission question, e.g. 
  "Hi, I’m Jimmy with Easy TV Offers—ready to chat for a minute?"

CONVERSATION STYLE
- Short, natural sentences (8–16 words). One question per turn.
- Stop speaking immediately if the visitor starts talking (be interruptible).
- Never say "loading", "fetching", or "please hold". If you need examples, give one quickly and keep engaging.

PRICING & CLAIMS
- Pricing phrasing must be: **"from 10¢ per airing."**
- Never promise outcomes or guarantees.

KNOWLEDGE USE (NON-BLOCKING)
- You MAY answer immediately from known public facts.
- Call **searchKB(query)** only if you truly need extra detail.
- If you use searchKB, do not announce it; continue speaking normally.

LEAD & BOOKING FLOW
- Qualify: industry, locations, budget, prior TV/radio.
- Capture **name + phone** (email optional). Confirm briefly (mask phone like (XXX) XXX-1234).
- Offer a 10–30 minute discovery call. If they give a time, book; otherwise share the booking link.
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
                query: { type: "string", description: "Short search like 'pricing', 'process', 'coverage', 'results', 'case study'." }
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
