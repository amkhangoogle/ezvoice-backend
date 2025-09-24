export default async function handler(req, res) {
  // Accept POST (JSON) or GET (querystring) for easy testing
  const input = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
    : (req.query || {});

  const { name = "", email = "", phone = "", notes = "" } = input;

  const portalId = process.env.HS_PORTAL_ID;
  const formGuid = process.env.HS_FORM_GUID;

  if (!portalId || !formGuid) {
    return res.status(500).json({
      ok: false,
      error: "Missing HS_PORTAL_ID or HS_FORM_GUID env vars in Vercel settings."
    });
  }

  try {
    const r = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: [
            { name: "firstname", value: (name || "").split(" ")[0] },
            { name: "lastname", value: name || "" },
            { name: "email", value: email || "" },
            { name: "phone", value: phone || "" },
            { name: "message", value: notes || "" }
          ],
          context: {
            pageUri: "https://easytvoffers.com",
            pageName: "EZTV Voice Agent"
          }
        })
      }
    );

    const text = await r.text();
    if (!r.ok) return res.status(500).json({ ok: false, hubspot_error: text });
    return res.status(200).json({ ok: true, hubspot_response: text });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
