export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // you can lock to https://easytvoffers.com later
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
        instructions: `
You are EZTV Voice—an upbeat, concise concierge for Easy TV Offers (10¢ per airing).
Goals: greet, qualify interest/location/budget, capture NAME/EMAIL/PHONE,
offer to schedule a 10-min discovery call.
Never promise outcomes or pricing beyond "from 10¢ per airing".
Honor do-not-call requests; keep replies short and friendly.
        `,
        tools: [
          {
            type: "function",
            name: "createLead",
            description: "Save a lead in the website CRM",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                notes: { type: "string" }
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
                isoDatetime: { type: "string", description: "ISO 8601 start time" },
                durationMins: { type: "number", default: 15 }
              },
              required: ["isoDatetime"]
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
