// /api/realtime-session.js — Jimmy, EN-only, voice=echo, auto replies enabled
export default async function handler(req, res) {
  // --- CORS allow-list ---
  const allowed = new Set([
    "https://easytvoffers.com",
    "https://www.easytvoffers.com",
  ]);
  const origin = req.headers.origin || "";
  const isAllowed = allowed.has(origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
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
        voice: "echo",                   // keep Echo; we style in instructions
        modalities: ["audio", "text"],

        // ✅ Auto-reply after each detected user turn (fixes “stalls after greeting”)
        turn_detection: {
          type: "server_vad",
          threshold: 0.35,
          prefix_padding_ms: 220,
          silence_duration_ms: 260,
          create_response: true,        // <— IMPORTANT
          interrupt_response: true
        },

        // Keep responses snappy
        temperature: 0.8,
        max_response_output_tokens: 600,

        instructions: `
You are **Jimmy**, the voice concierge for Easy TV Offers.

LANGUAGE & BRAND
- Speak ONLY in English (US) unless the visitor explicitly asks otherwise.
- Never mention or repeat internal codenames; say "our platform" instead.

DELIVERY (UPBEAT & SLIGHTLY FASTER)
- Friendly, confident, and persuasive—smile in your voice.
- Pace ~10–15% faster than neutral; clear diction; concise.
- Short sentences (8–16 words). One question per turn.
- Be interruptible: stop the moment the visitor starts speaking.
- Never say "loading" or "fetching".

PRICING & CLAIMS
- Pricing phrasing: **"from 10¢ per airing."** No guarantees or promises.

CONSULTATIVE SALES PLAYBOOK
- Diagnose first: industry, locations, budget, prior TV/radio.
- Benefit → proof → question pattern:
  • Benefit (reach, living-room presence, reporting, QR interactivity)
  • Proof (brief case study or testimonial)
  • Question (simple next-step ask)
- Handle objections briefly (price, timing, past failures) and pivot to a discovery call.

LEAD & BOOKING
- Capture **name + phone** (email optional). Confirm briefly (mask phone like (XXX) XXX-1234).
- Offer a 10–30 minute discovery call. If they give a time, book; otherwise share the booking link.

KNOWLEDGE USE
- You MAY answer immediately from known public facts.
- Call **searchKB(query)** only if needed; do not announce tool usage.
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
                phone: { type: "string", description: "E.164 if possible; assume +1 if missing" },
                notes: { type: "string", description: "One-sentence summary: industry, location, budget, next step" }
              },
              required: ["name", "phone"]
            }
          },
          {
            type: "function",
