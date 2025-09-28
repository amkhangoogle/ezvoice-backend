// /public/ezvoice-widget.js — EZTV Voice (Jimmy): greet, iOS-safe proxy, deep docs tool
(function () {
  const backend = "https://ezvoice-backend.vercel.app"; // change if your Vercel URL differs

  function log(){ try{ console.log("[EZTV]", ...arguments);}catch{} }
  function err(){ try{ console.error("[EZTV]", ...arguments);}catch{} }

  function ensureUI(){
    let root=document.getElementById("eztv-voice-root");
    if(!root){ root=document.createElement("div"); root.id="eztv-voice-root";
      root.style.cssText="position:fixed;bottom:20px;right:20px;z-index:9999;"; document.body.appendChild(root); }
    let audio=document.getElementById("eztv-voice-remote");
    if(!audio){ audio=document.createElement("audio"); audio.id="eztv-voice-remote"; audio.autoplay=true; audio.setAttribute("playsinline","true"); root.appendChild(audio); }
    let btn=document.getElementById("eztv-voice-btn");
    if(!btn){ btn=document.createElement("button"); btn.id="eztv-voice-btn"; btn.textContent="Talk to EZTV Voice";
      btn.style.cssText="background:#10b981;color:#fff;border:none;border-radius:9999px;padding:12px 18px;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;"; root.appendChild(btn); }
    return { audio, btn };
  }

  function attach(){
    const { audio, btn } = ensureUI();
    let active=false, pc=null, dc=null, localStream=null, greeted=false;
    const toolBuf=new Map();
    const docsCache=new Map(); // simple cache by query

    function setBtn(on){ active=on; btn.textContent=on?"Stop • EZTV Voice":"Talk to EZTV Voice"; btn.style.background=on?"#ef4444":"#10b981"; }
    function greetOnce(){ if(greeted || !dc || dc.readyState!=="open") return; try{ dc.send(JSON.stringify({ type:"response.create" })); greeted=true; }catch(e){ err("greet", e); } }
    function bufDelta(m){ const id=m.call_id; const cur=toolBuf.get(id)||{name:m.name,args:{}}; if(m.arguments) Object.assign(cur.args,m.arguments); if(!cur.name) cur.name=m.name; toolBuf.set(id,cur); }
    function flushArgs(id){ const cur=toolBuf.get(id)||{args:{}}; toolBuf.delete(id); return cur; }
    function sendToolOutput(call_id, output){ try{ dc && dc.send(JSON.stringify({type:"response.function_call_output", call_id, output})); }catch(e){ err("sendToolOutput", e); } }

    async function start(){
      setBtn(true);
      try{
        const s = await fetch(backend+"/api/realtime-session");
        if(!s.ok){ const t=await s.text(); throw new Error("Session failed: "+t); }
        const js = await s.json();
        const eph = js.client_secret?.value || js.client_secret || js.ephemeral_key;
        if(!eph) throw new Error("Missing ephemeral key");

        pc=new RTCPeerConnection();
        pc.ontrack=(e)=>{ audio.srcObject=e.streams[0]; };
        pc.oniceconnectionstatechange=()=>{ log("ICE:", pc.iceConnectionState); if(["failed","disconnected"].includes(pc.iceConnectionState)) stop(); };
        pc.onconnectionstatechange=()=>{ log("PC:", pc.connectionState); if(pc.connectionState==="connected"){ setTimeout(greetOnce, 250); } if(["failed","disconnected","closed"].includes(pc.connectionState)) stop(); };

        try{ localStream=await navigator.mediaDevices.getUserMedia({audio:true}); }
        catch{ throw new Error("Microphone permission denied or unavailable."); }
        localStream.getTracks().forEach(t=> pc.addTrack(t, localStream));

        dc = pc.createDataChannel("oai-events");
        dc.onopen=()=>{ log("DC open"); greetOnce(); setTimeout(greetOnce,600); };
        dc.onerror=(e)=>err("DC", e);

        dc.onmessage=async (evt)=>{
          try{
            const msg=JSON.parse(evt.data);

            if(msg.type==="response.function_call_arguments.delta" && msg.name){
              bufDelta(msg);
            } else if(msg.type==="response.function_call_arguments.done"){
              const { name, args } = flushArgs(msg.call_id);

              if(name==="searchDocs"){
                const q=(args?.query||"").toString().trim();
                try{
                  const key=q.toLowerCase();
                  let text;
                  if(docsCache.has(key)){ text = docsCache.get(key); }
                  else{
                    const r = await fetch(backend + "/api/search-docs?q=" + encodeURIComponent(q));
                    const out = await r.json();
                    const lines = (out.results||[]).map(x => `${x.title} — ${x.section}: ${x.snippet}`);
                    text = lines.join("\n---\n") || "NO_MATCH";
                    docsCache.set(key, text);
                  }
                  sendToolOutput(msg.call_id, text);
                }catch(e){
                  err("searchDocs", e);
                  sendToolOutput(msg.call_id, "NO_MATCH");
                }
              }

              if(name==="createLead"){
                try{
                  const r=await fetch(backend+"/api/lead",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(args) });
                  const out=await r.json().catch(()=>({ok:false}));
                  sendToolOutput(msg.call_id, out);
                }catch(e){ sendToolOutput(msg.call_id, { ok:false, error:String(e) }); }
              }

              if(name==="bookCall"){
                try{
                  const r=await fetch(backend+"/api/book",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(args) });
                  const out=await r.json().catch(()=>({ok:true, bookingUrl:"https://cal.com/amkhan/30min"}));
                  sendToolOutput(msg.call_id, out);
                }catch(e){ sendToolOutput(msg.call_id, { ok:true, bookingUrl:"https://cal.com/amkhan/30min" }); }
              }
            }
          }catch(e){ err("DC message", e); }
        };

        const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
        const sdpRes=await fetch(backend+"/api/realtime-sdp", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ sdp: offer.sdp, eph })
        });
        if(!sdpRes.ok){
          const t=await sdpRes.text().catch(()=> "");
          err("SDP proxy", sdpRes.status, t);
          alert("Voice setup error: Failed to fetch");
          return stop();
        }
        await pc.setRemoteDescription({ type:"answer", sdp: await sdpRes.text() });

        log("connected");
      }catch(e){
        err("start()", e);
        alert("Voice setup error: " + (e?.message || "Failed to fetch"));
        stop();
      }
    }

    function stop(){
      try{
        if(dc){ try{ dc.close(); }catch{} dc=null; }
        if(pc){ try{ pc.getSenders().forEach(s=> s.track && s.track.stop()); }catch{} try{ pc.close(); }catch{} pc=null; }
        if(localStream){ try{ localStream.getTracks().forEach(t=>t.stop()); }catch{} localStream=null; }
        try{ audio.srcObject=null; }catch{}
      }finally{ greeted=false; setBtn(false); }
    }

    btn.addEventListener("click", ()=> (active? stop(): start()));
    log("widget ready (Jimmy + deep docs)");
  }

  if(document.readyState==="complete"||document.readyState==="interactive") attach();
  else window.addEventListener("load", attach);
})();
