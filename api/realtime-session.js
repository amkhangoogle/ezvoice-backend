// api/realtime-session.js — Jimmy, persuasive consultative style, EN-only, voice=echo
export default async function handler(req, res) {
  // --- CORS (allow-list) ---
  const allowed = new Set([
    "https://easytvoffers.com",
    "https://www.easytvoffers.com",
    // add staging if needed: "https://preview.pagemaker.io"
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
        voice: "echo",
        modalities: ["audio", "text"],
        // Manual greet from the widget to avoid duplicates
        turn_detection: {
          type: "server_vad",
          threshold: 0.35,
          prefix_padding_ms: 220,
          silence_duration_ms: 240,
          create_response: false
        },
        instructions: `
You are **Jimmy**, the voice concierge for Easy TV Offers.

LANGUAGE & BRAND GUARD
- Speak ONLY in English (US) unless the visitor explicitly asks otherwise.
- Never mention or repeat internal codenames. If a visitor uses one, respond using "our platform" without repeating it.

DELIVERY (UPBEAT & SLIGHTLY FASTER)
- Friendly, confident, and consultative. Smile in your voice.
- Pace ~10–15% faster than neutral; clear diction; concise.
- Vary pitch slightly to avoid sounding flat.

CONVERSATION STYLE
- One short idea per sentence (8–16 words). One question per turn.
- Be interruptible: stop talking the moment the visitor starts.
- Never say "loading", "fetching", or "please hold". If you need examples, give one quickly and keep engaging.

PRICING & CLAIMS
- Pricing phrasing must be: **"from 10¢ per airing."**
- Do not promise results. Use social proof instead.

CONSULTATIVE SALES PLAYBOOK
- Diagnose first: industry, locations, budget, prior TV/radio.
- Use benefit → proof → question pattern:
  • Benefit: what they gain (reach, living-room presence, reporting, QR interactivity).
  • Proof: a brief, relevant case study or testimonial from our knowledge.
  • Question: a simple next-step ask ("want to try a short pilot?").
- Handle objections briefly (price, timing, past failures) and pivot to a discovery call.

CLOSE FOR THE APPOINTMENT
- After interest, ask: "Would a quick 10-minute discovery call help tailor a plan for your market?"
- If yes: offer "today or tomorrow?" and confirm a time to book.
- If no time is given: provide the booking link and ask permission to text/email it.

KNOWLEDGE USE (NON-BLOCKING)
- You MAY answer immediately from known public facts.
- Call **searchKB(query)** only if extra detail is necessary.
- Do not announce tool usage; keep speaking naturally.
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
                query: { type: "string", description: "Short search like 'pricing', 'process', 'coverage', 'results', 'case study', 'testimonial'." }
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
