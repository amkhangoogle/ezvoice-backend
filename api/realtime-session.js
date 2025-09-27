export default async function handler(req, res) {
  // --- CORS (allow-list) ---
  const allowed = new Set([
    "https://easytvoffers.com",
    "https://www.easytvoffers.com"
    // add your PageMaker preview origin if needed
  ]);
  const origin = req.headers.origin || "";
  const isAllowed = allowed.has(origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  // --------------

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
        voice: "verse",
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 250,
          silence_duration_ms: 300,
          create_response: true
        },
        instructions: `
You are EZTV Voice, a concise concierge for Easy TV Offers (10¢ per airing).
Rules: one question at a time; short sentences; stop if the user talks; never promise outcomes; price phrasing is "from 10¢ per airing".

**Knowledge use (VERY IMPORTANT):**
Before answering questions about pricing, process, coverage/targeting, compliance, results/measurement, or FAQs,
call the tool **searchKB(query)** with a short query (e.g., "pricing", "process", "coverage").
Use the returned snippets as your source of truth. If no result matches, answer briefly and offer to clarify.

Tools behavior:
- createLead(name, email, phone, notes): call after you have **name + phone** (email optional). Put a 1-sentence summary in notes.
- bookCall(isoDatetime, durationMins): when the user gives a time like "tomorrow at 3pm", infer ISO in the user's timezone.
- searchKB(query): when you need factual guidance; quote only facts returned; keep answers short.
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
