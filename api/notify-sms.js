export default async function handler(req, res) {
  const input = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
    : (req.query || {});
  const { to, text } = input;

  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.SMS_FROM;
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;

  if (!apiKey || !from) {
    return res.status(500).json({ ok: false, error: "Missing TELNYX_API_KEY or SMS_FROM env vars" });
  }
  if (!to || !text) {
    return res.status(400).json({ ok: false, error: "to and text are required" });
  }

  try {
    const r = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from,
        to,
        text,
        ...(profileId ? { messaging_profile_id: profileId } : {})
      })
    });
    const out = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, telnyx_error: out });
    return res.status(200).json({ ok: true, id: out?.data?.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
