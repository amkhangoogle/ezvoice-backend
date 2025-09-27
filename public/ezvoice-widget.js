// EZTV Voice external widget (tools + local KB) — v2 fast
(function () {
  const backend = "https://ezvoice-backend.vercel.app"; // change if your Vercel URL differs

  // --- Local KB (short, public, codename-free). Keep it concise for instant examples. ---
  const KB = [
    {
      title: "Offer basics",
      tags: ["pricing","cost","rates","10 cents","ten cents","airing","budget"],
      content: `We place ads on Connected TV (e.g., YouTube on TVs). Pricing starts from **10¢ per airing**; exact rates vary by market, inventory, and time-of-day. No guaranteed outcomes.`
    },
    {
      title: "Channels & coverage",
      tags: ["CTV","connected tv","youtube tv","living room","national","local","coverage"],
      content: `Primary channel is YouTube on living-room TVs. We support national and local placements; targeting depends on market inventory and dayparts.`
    },
    {
      title: "Creative & speed",
      tags: ["creative","script","voiceover","editing","turnkey","72 hours","launch"],
      content: `Turnkey workflow: scripting, pro voiceover, editing. Launch can be ~72 hours after assets approval.`
    },
    {
      title: "QR & reporting",
      tags: ["qr","scan","promo","reporting","analytics","time slots","scans"],
      content: `We can embed QR codes for offers and opt-ins. Reporting shows when ads ran, estimated views, dayparts, and QR scans.`
    },
    {
      title: "Process summary",
      tags: ["process","onboarding","steps","how it works"],
      content: `Greet → qualify (industry, locations, budget) → capture name + phone (email optional) → propose plan → offer a 10–30 minute discovery call.`
    },
    {
      title: "Lead capture rules",
      tags: ["lead","contact","phone","email","forms","consent"],
      content: `Required: name + phone. Optional: email. Confirm back briefly (mask phone like (XXX) XXX-1234). If declined, offer the booking link.`
    },
    {
      title: "Compliance",
      tags: ["compliance","privacy","do not call","dncl","sensitive"],
      content: `Honor do-not-contact. Don’t collect sensitive data. Use contact info only for service follow-up.`
    },
    // Case studies / proof (brief)
    {
      title: "Case study: Math learning center",
      tags: ["case study","proof","mathnasium","lead spike"],
      content: `~16k+ TV airings in ~30 days; owner reported a noticeable lead spike.`
    },
    {
      title: "Case study: Local realtor",
      tags: ["case study","realtor","buyers","sellers"],
      content: `Two campaigns (buyers & sellers); new opt-ins and seller leads within days.`
    },
    {
      title: "Case study: Insurance agency",
      tags: ["case study","insurance","qr","inquiries"],
      content: `TV commercial with QR code drove SMS texts and direct inquiries.`
    },
    {
      title: "Case study: Restaurant",
      tags: ["case study","restaurant","orders"],
      content: `First week produced a mix of calls, SMS, and orders.`
    },
    {
      title: "Booking link",
      tags: ["booking","cal.com","schedule","meeting","discovery"],
      content: `Schedule a 10–30 minute discovery call: https://cal.com/amkhan/30min`
    },
    // Our platform (codename-free)
    {
      title: "Platform: overview",
      tags: ["platform","overview","product","service"],
      content: `Helps businesses place TV-style airings on living-room screens with simple setup and transparent metrics.`
    },
    {
      title: "Platform: onboarding",
      tags: ["platform","onboarding","setup","start"],
      content: `1) Discovery → 2) Access & assets → 3) Creative/placements plan → 4) Launch (often 3–5 business days after assets).`
    },
    {
      title: "Platform: measurement",
      tags: ["platform","results","roi","kpi","measurement"],
      content: `No guaranteed outcomes. Typical KPIs: leads, calls, site visits, QR scans. Align expectations during the discovery call.`
    }
  ];
  function normalizeQuery(q) { return (q || "").toLowerCase().replace(/\bnedzo\b/g, "platform"); }
  function localSearchKB(q) {
    const s = normalizeQuery(q).trim();
    if (!s) return [];
    const terms = s.split(/\s+/).filter(Boolean);
    const scored = KB.map(a => {
      const txt = (a.title + " " + a.tags.join(" ") + " " + a.content).toLowerCase();
      let score = 0;
      for (const t of terms) if (txt.includes(t)) score += 2;
      for (const t of a.tags) if (s.includes(t.toLowerCase())) score += 3;
      if (a.title.toLowerCase().includes(s)) score += 5;
      return { a, score };
    }).filter(x => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map(x => ({ title: x.a.title, content: x.a.content }));
    return scored;
  }

  function log() { try { console.log("[EZTV]", ...arguments); } catch {} }
  function warn() { try { console.warn("[EZTV]", ...arguments); } catch {} }
  function err() { try { console.error("[EZTV]", ...arguments); } catch {} }

  function ensureUI() {
    let root = document.getElementById("eztv-voice-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "eztv-voice-root";
      root.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;";
      document.body.appendChild(root);
    }
    let audioEl = document.getElementById("eztv-voice-remote");
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = "eztv-voice-remote";
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      root.appendChild(audioEl);
    }
    let btn = document.getElementById("eztv-voice-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "eztv-voice-btn";
      btn.textContent = "Talk to EZTV Voice";
      btn.style.cssText = "background:#10b981;color:#fff;border:none;border-radius:9999px;padding:12px 18px;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;";
      root.appendChild(btn);
    }
    return { root, audioEl, btn };
  }

  function attach() {
    const { audioEl, btn } = ensureUI();
    let active = false, pc = null, dc = null, localStream = null;
    const toolBuf = new Map();

    function setBtn(on) {
      active = on;
      btn.textContent = on ? "Stop • EZTV Voice" : "Talk to EZTV Voice";
      btn.style.background = on ? "#ef4444" : "#10b981";
    }
    function bufDelta(m) {
      const id = m.call_id;
      const cur = toolBuf.get(id) || { name: m.name, args: {} };
      if (m.arguments) Object.assign(cur.args, m.arguments);
      if (!cur.name) cur.name = m.name;
      toolBuf.set(id, cur);
    }
    function flushArgs(id) { const cur = toolBuf.get(id) || { args: {} }; toolBuf.delete(id); return cur; }
    function sendToolOutput(call_id, output) {
      try { dc && dc.send(JSON.stringify({ type: "response.function_call_output", call_id, output })); } catch (e) { warn("sendToolOutput", e); }
    }

    async function start() {
      log("start clicked");
      setBtn(true);
      try {
        // 1) ephemeral session
        const sessRes = await fetch(backend + "/api/realtime-session");
        if (!sessRes.ok) { const t = await sessRes.text(); throw new Error("Session fetch failed: " + t); }
        const sess = await sessRes.json();
        const eph = sess.client_secret?.value || sess.client_secret || sess.ephemeral_key;
        if (!eph) throw new Error("Missing ephemeral key");

        // 2) WebRTC
        pc = new RTCPeerConnection();
        pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

        pc.oniceconnectionstatechange = () => {
          log("ICE:", pc.iceConnectionState);
          if (["failed", "disconnected"].includes(pc.iceConnectionState)) stop();
        };
        pc.onconnectionstatechange = () => {
          log("PC:", pc.connectionState);
          if (["failed", "disconnected", "closed"].includes(pc.connectionState)) stop();
        };

        try {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr) {
          throw new Error("Microphone permission denied or unavailable.");
        }
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

        dc = pc.createDataChannel("oai-events");
        dc.onopen = () => { log("datachannel open"); /* server_vad will auto-greet */ };
        dc.onerror = (e) => err("datachannel error", e);

        dc.onmessage = async (evt) => {
          try {
            const msg = JSON.parse(evt.data);

            if (msg.type === "response.function_call_arguments.delta" && msg.name) {
              bufDelta(msg);
            } else if (msg.type === "response.function_call_arguments.done") {
              const { name, args } = flushArgs(msg.call_id);

              if (name === "createLead") {
                const r = await fetch(backend + "/api/lead", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(args)
                });
                const out = await r.json();
                // best-effort SMS
                fetch(backend + "/api/notify-sms", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ to: "+12486020201", text: `New EZTV lead: ${(args.name || "").slice(0, 40)} ${(args.phone || "")} ${(args.email || "")}` })
                }).catch(() => { });
                sendToolOutput(msg.call_id, out);
              }

              if (name === "bookCall") {
                const r = await fetch(backend + "/api/book", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(args)
                });
                const out = await r.json();
                sendToolOutput(msg.call_id, out);
              }

              if (name === "searchKB") {
                const q = (args?.query || "").toString();
                // 🚀 Instant local answer (no network wait)
                const local = localSearchKB(q);
                const text = (local && local.length)
                  ? local.map(x => `${x.title}: ${x.content}`).join("\n---\n")
                  : "NO_MATCH";
                sendToolOutput(msg.call_id, text);
              }
            }
          } catch (e) { err("DC message error", e); }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: "Bearer " + eph,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1"
          }
        });
        if (!sdpRes.ok) {
          const t = await sdpRes.text();
          err("Realtime SDP error", sdpRes.status, t);
          alert("OpenAI Realtime error " + sdpRes.status + ". See Console.");
          return stop();
        }
        await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
        log("connected");
      } catch (e) {
        err("start() failed", e);
        alert("Voice setup error: " + (e?.message || String(e)));
        stop();
      }
    }

    function stop() {
      try {
        if (dc) { try { dc.close(); } catch {} dc = null; }
        if (pc) {
          try { pc.getSenders().forEach(s => s.track && s.track.stop()); } catch {}
          try { pc.close(); } catch {}
          pc = null;
        }
        if (localStream) {
          try { localStream.getTracks().forEach(t => t.stop()); } catch {}
          localStream = null;
        }
        try { if (audioEl) audioEl.srcObject = null; } catch {}
      } finally { setBtn(false); }
    }

    btn.addEventListener("click", () => (active ? stop() : start()));
    log("widget ready (external, local KB)");
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    attach();
  } else {
    window.addEventListener("load", attach);
  }
})();
