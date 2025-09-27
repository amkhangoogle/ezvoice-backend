// EZTV Voice external widget (tools + KB) — v1
(function () {
  const backend = "https://ezvoice-backend.vercel.app"; // change if your Vercel URL differs

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

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

        dc = pc.createDataChannel("oai-events");
        dc.onopen = () => { log("datachannel open"); try { dc.send(JSON.stringify({ type: "response.create" })); } catch {} };
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
                const r = await fetch(backend + "/api/kb?query=" + encodeURIComponent(q));
                const out = await r.json();
                const text = (out?.results || []).map(x => `${x.title}: ${x.content}`).join("\n---\n") || "NO_MATCH";
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
        if (dc) { try { dc.close(); } catch { } dc = null; }
        if (pc) { try { pc.getSenders().forEach(s => s.track && s.track.stop()); } catch { } try { pc.close(); } catch { } pc = null; }
        if (localStream) { try { localStream.getTracks().forEach(t => t.stop()); } catch { } localStream = null; }
      } finally { setBtn(false); }
    }

    btn.addEventListener("click", () => (active ? stop() : start()));
    log("widget ready (external)");
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    attach();
  } else {
    window.addEventListener("load", attach);
  }
})();
