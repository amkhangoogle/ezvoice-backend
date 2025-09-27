// /public/ezvoice-widget.js — EZTV Voice (Jimmy) with iOS-safe SDP proxy, greet-on-connect, local KB
(function () {
  // Change if your Vercel URL differs:
  const backend = "https://ezvoice-backend.vercel.app";

  // ======= Local KB (instant answers; codename-free) =======
  const KB = [
    { title:"Offer basics", tags:["offer","pricing","rates","10 cents","airing","ctv","connected tv","youtube tv"],
      content:`We place ads on Connected TV (e.g., YouTube on TVs). Pricing starts from **10¢ per airing**; exact rates vary by market, inventory, and time of day. No guaranteed outcomes.` },
    { title:"Channels & coverage", tags:["channels","coverage","national","local","targeting","dayparts","inventory"],
      content:`Placements on YouTube Connected TV (living-room screens). We support national and local coverage; targeting and dayparts depend on market inventory.` },
    { title:"Creative & speed", tags:["creative","script","voiceover","editing","turnkey","launch","72 hours"],
      content:`Turnkey: scripting, pro voiceover, editing. Launch can be ~72 hours after assets approval.` },
    { title:"QR codes & reporting", tags:["qr","scan","promo","reporting","analytics","time slots"],
      content:`We can embed QR codes. Reports show when ads ran, estimated views, dayparts, and QR scans.` },
    { title:"Process summary", tags:["process","onboarding","steps","how it works"],
      content:`Qualify → capture name + phone (email optional) → propose plan → offer a 10–30 minute discovery call.` },
    { title:"Lead capture rules", tags:["lead","contact","phone","email","consent","privacy"],
      content:`Required: name + phone. Optional: email. Confirm back briefly (mask phone). If declined, offer the booking link.` },
    { title:"Compliance", tags:["compliance","privacy","do not call","dncl","sensitive"],
      content:`Honor do-not-contact. Don’t collect sensitive data. Use contact info only for service follow-up.` },
    // Case studies & testimonials
    { title:"Case study: Math learning center", tags:["case study","education","mathnasium","lead spike"],
      content:`~16,435 TV spots in ~30 days; owner reported a noticeable spike in leads.` },
    { title:"Case study: Local realtor", tags:["case study","real estate","buyers","sellers","opt-ins"],
      content:`Two campaigns generated website opt-ins and seller leads within days.` },
    { title:"Case study: Insurance agency", tags:["case study","insurance","qr","inquiries","sms"],
      content:`QR in TV commercial drove SMS texts and direct inquiries.` },
    { title:"Case study: Restaurant", tags:["case study","restaurant","orders"],
      content:`First week produced a mix of calls, SMS, and orders.` },
    { title:"Testimonials (selected)", tags:["testimonial","reviews","social proof"],
      content:`Skin by Kat: ~65% growth in ~30 days. Avenue Hotel: 27 bookings from hundreds of enquiries. Gyro Boys: customers came in after seeing TV.` },
    { title:"Booking link", tags:["booking","cal.com","schedule","meeting","discovery"],
      content:`Book a 10–30 minute discovery call: https://cal.com/amkhan/30min` },
    // Sales playbook
    { title:"Sales: objection handling", tags:["sales","objections","price","budget","timing","convincing","close"],
      content:`Price: start from 10¢ per airing; tailor to budget. Will it work: depends on creative/market; see case studies. Tried TV before: CTV is precise and reportable. Not ready: let's outline a small pilot in a 10-minute call.` },
    { title:"Sales: recommended close", tags:["sales","closing","next step","calendar"],
      content:`"Would a quick 10-minute discovery call help tailor a plan for your market?" If yes: today or tomorrow? If no: here’s the link to book anytime.` }
  ];

  function normalizeQuery(q){ return (q||"").toLowerCase().replace(/\bnedzo\b/g,"platform"); }
  function localSearchKB(q){
    const s = normalizeQuery(q).trim(); if(!s) return [];
    const terms = s.split(/\s+/).filter(Boolean);
    const scored = KB.map(a=>{
      const txt=(a.title+" "+a.tags.join(" ")+" "+a.content).toLowerCase();
      let score=0;
      for(const t of terms) if(txt.includes(t)) score+=2;
      for(const t of a.tags) if(s.includes(t.toLowerCase())) score+=3;
      if(a.title.toLowerCase().includes(s)) score+=5;
      return {a,score};
    }).filter(x=>x.score>0).sort((x,y)=>y.score-x.score).slice(0,3).map(x=>({title:x.a.title,content:x.a.content}));
    return scored;
  }

  // ======= UI + Realtime glue (greet-on-connect) =======
  function log(){ try{ console.log("[EZTV]", ...arguments);}catch{} }
  function warn(){ try{ console.warn("[EZTV]", ...arguments);}catch{} }
  function err(){ try{ console.error("[EZTV]", ...arguments);}catch{} }

  function ensureUI(){
    let root=document.getElementById("eztv-voice-root");
    if(!root){ root=document.createElement("div"); root.id="eztv-voice-root";
      root.style.cssText="position:fixed;bottom:20px;right:20px;z-index:9999;"; document.body.appendChild(root); }
    let audioEl=document.getElementById("eztv-voice-remote");
    if(!audioEl){ audioEl=document.createElement("audio"); audioEl.id="eztv-voice-remote"; audioEl.autoplay=true; audioEl.setAttribute("playsinline","true"); root.appendChild(audioEl); }
    let btn=document.getElementById("eztv-voice-btn");
    if(!btn){ btn=document.createElement("button"); btn.id="eztv-voice-btn"; btn.textContent="Talk to EZTV Voice";
      btn.style.cssText="background:#10b981;color:#fff;border:none;border-radius:9999px;padding:12px 18px;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;"; root.appendChild(btn); }
    return {root,audioEl,btn};
  }

  function attach(){
    const {audioEl,btn}=ensureUI();
    let active=false, pc=null, dc=null, localStream=null, greeted=false;
    const toolBuf=new Map();

    function setBtn(on){ active=on; btn.textContent=on?"Stop • EZTV Voice":"Talk to EZTV Voice"; btn.style.background=on?"#ef4444":"#10b981"; }
    function bufDelta(m){ const id=m.call_id; const cur=toolBuf.get(id)||{name:m.name,args:{}}; if(m.arguments) Object.assign(cur.args,m.arguments); if(!cur.name) cur.name=m.name; toolBuf.set(id,cur); }
    function flushArgs(id){ const cur=toolBuf.get(id)||{args:{}}; toolBuf.delete(id); return cur; }
    function sendToolOutput(call_id, output){ try{ dc && dc.send(JSON.stringify({type:"response.function_call_output", call_id, output})); }catch(e){ warn("sendToolOutput", e); } }

    function greetOnce(){
      if(greeted || !dc || dc.readyState!=="open") return;
      try{ dc.send(JSON.stringify({ type:"response.create" })); greeted=true; log("auto-greet sent"); }catch(e){ warn("auto-greet send failed", e); }
    }

    async function start(){
      log("start clicked"); setBtn(true);
      try{
        // 1) Get ephemeral key
        const sessRes=await fetch(backend+"/api/realtime-session");
        if(!sessRes.ok){ const t=await sessRes.text(); throw new Error("Session fetch failed: "+t); }
        const sess=await sessRes.json();
        const eph=sess.client_secret?.value || sess.client_secret || sess.ephemeral_key;
        if(!eph) throw new Error("Missing ephemeral key");

        // 2) WebRTC wiring
        pc=new RTCPeerConnection();
        pc.ontrack=(e)=>{ audioEl.srcObject=e.streams[0]; };
        pc.oniceconnectionstatechange=()=>{ log("ICE:", pc.iceConnectionState); if(["failed","disconnected"].includes(pc.iceConnectionState)) stop(); };
        pc.onconnectionstatechange=()=>{ log("PC:", pc.connectionState); if(pc.connectionState==="connected"){ setTimeout(greetOnce, 250); } if(["failed","disconnected","closed"].includes(pc.connectionState)) stop(); };

        try{ localStream=await navigator.mediaDevices.getUserMedia({audio:true}); }
        catch(permErr){ throw new Error("Microphone permission denied or unavailable."); }
        localStream.getTracks().forEach(t=> pc.addTrack(t, localStream));

        dc=pc.createDataChannel("oai-events");
        dc.onopen=()=>{ log("datachannel open"); greetOnce(); setTimeout(greetOnce, 600); };
        dc.onerror=(e)=>err("datachannel error", e);
        dc.onmessage=async (evt)=>{
          try{
            const msg=JSON.parse(evt.data);
            if(msg.type==="response.function_call_arguments.delta" && msg.name){ bufDelta(msg); }
            else if(msg.type==="response.function_call_arguments.done"){
              const {name, args}=flushArgs(msg.call_id);

              if(name==="createLead"){
                const r=await fetch(backend+"/api/lead",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(args) });
                const out=await r.json();
                fetch(backend+"/api/notify-sms",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ to:"+12486020201", text:`New EZTV lead: ${(args.name||"").slice(0,40)} ${(args.phone||"")} ${(args.email||"")}` }) }).catch(()=>{});
                sendToolOutput(msg.call_id, out);
              }

              if(name==="bookCall"){
                const r=await fetch(backend+"/api/book",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(args) });
                const out=await r.json(); sendToolOutput(msg.call_id, out);
              }

              if(name==="searchKB"){
                const q=(args?.query||"").toString();
                const local=localSearchKB(q);
                const text=(local&&local.length)? local.map(x=>`${x.title}: ${x.content}`).join("\n---\n") : "NO_MATCH";
                sendToolOutput(msg.call_id, text);
              }
            }
          }catch(e){ err("DC message error", e); }
        };

        // 3) Create offer and POST via our iOS-safe proxy
        const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
        const sdpRes=await fetch(backend + "/api/realtime-sdp", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ sdp: offer.sdp, eph })
        });
        if(!sdpRes.ok){
          const t=await sdpRes.text().catch(()=> "");
          err("Realtime SDP error (proxy)", sdpRes.status, t);
          alert("Voice setup error: Load failed");
          return stop();
        }
        await pc.setRemoteDescription({ type:"answer", sdp:await sdpRes.text() });
        log("connected");
      }catch(e){
        err("start() failed:", e);
        alert("Voice setup error: " + (e?.message || String(e)));
        stop();
      }
    }

    function stop(){
      try{
        if(dc){ try{ dc.close(); }catch{} dc=null; }
        if(pc){ try{ pc.getSenders().forEach(s=> s.track && s.track.stop()); }catch{} try{ pc.close(); }catch{} pc=null; }
        if(localStream){ try{ localStream.getTracks().forEach(t=>t.stop()); }catch{} localStream=null; }
        try{ if(audioEl) audioEl.srcObject=null; }catch{}
      }finally{ greeted=false; setBtn(false); }
    }

    btn.addEventListener("click", ()=> (active ? stop() : start()));
    log("widget ready (Jimmy, iOS-safe proxy, local KB, greet-on-connect)");
  }

  if(document.readyState==="complete" || document.readyState==="interactive"){ attach(); }
  else{ window.addEventListener("load", attach); }
})();
