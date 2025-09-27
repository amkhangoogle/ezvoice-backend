// /api/realtime-sdp.js — proxy SDP offer to OpenAI Realtime (fixes iOS "Failed to fetch")
export default async function handler(req, res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Expect JSON: { sdp: string, eph: string }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }
    const sdp = body?.sdp;
    const eph = body?.eph;
    if (!sdp || !eph) return res.status(400).json({ error: "Missing sdp or eph" });

    const r = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${eph}`,
        "Content-Type": "application/sdp",
        "OpenAI-Beta": "realtime=v1",
      },
      body: sdp,
    });

    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/sdp");
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
