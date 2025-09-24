export default async function handler(req, res) {
  // Accept POST or GET; for "simple mode" we just return your booking link.
  const link = process.env.CALCOM_PUBLIC_LINK;

  // Optional API mode variables (ignore for now)
  const token = process.env.CALCOM_API_TOKEN;       // optional
  const username = process.env.CALCOM_USERNAME;     // optional
  const eventSlug = process.env.CALCOM_EVENT_SLUG;  // optional

  try {
    // SIMPLE MODE: no API token? just hand back your booking page link.
    if (!token) {
      if (!link) {
        return res.status(500).json({
          ok: false,
          error: "Missing CALCOM_PUBLIC_LINK env var. Add it in Vercel settings."
        });
      }
      return res.status(200).json({ ok: true, meetingUrl: link });
    }

    // === API MODE (optional): if you later add the token & event, we can auto-book ===
    const body =
      req.method === "POST"
        ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
        : (req.query || {});
    const { isoDatetime, durationMins = 15, lead = {} } = body;

    if (!username || !eventSlug) {
      return res.status(500).json({ ok: false, error: "Missing CALCOM_USERNAME or CALCOM_EVENT_SLUG" });
    }
    if (!isoDatetime) {
      return res.status(400).json({ ok: false, error: "isoDatetime is required in API mode" });
    }

    const r = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        eventType: `${username}/${eventSlug}`,
        start: isoDatetime,
        name: lead?.name || "EZTV Prospect",
        email: lead?.email || "noemail@easytvoffers.com",
        guests: [{ email: process.env.NOTIFY_EMAIL || "team@easytvoffers.com" }],
        metadata: { phone: lead?.phone, source: "voice", durationMins }
      })
    });
    const out = await r.json();
    const meetingUrl =
      out?.data?.booking?.meetingUrl ||
      out?.data?.booking?.additionalFields?.meetingUrl ||
      link || "#";
    return res.status(200).json({ ok: true, meetingUrl, raw: out });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
