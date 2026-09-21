/* =========================================================
   WasteWise AI — MVP Prototype
   Clean service interfaces; mock implementations in Demo Mode.
   Production: swap Mock* services for real API calls.
   ========================================================= */
"use strict";

/* ---------- global state ---------- */
const S = {
  lang:"en", location:"cafeteria", muted:false, captionSize:"medium",
  screen:"screen-splash", currentItem:null, lastAnswer:null,
  conversation:[], demoMode:true, offline:false, qSeq:1042,
  analytics:null, queries:null
};
let camStream = null, speaking = false, lastAIText = "";

/* ---------- persistence ---------- */
function save(){ try{ localStorage.setItem("ww_state", JSON.stringify({
  lang:S.lang, muted:S.muted, captionSize:S.captionSize, location:S.location,
  analytics:S.analytics, queries:S.queries, qSeq:S.qSeq })); }catch(e){} }
function load(){ try{ const d = JSON.parse(localStorage.getItem("ww_state")||"{}"); 
  Object.assign(S, d); }catch(e){} 
  if(!S.analytics) S.analytics = {scans:0, helpful:0, notHelpful:0, notsure:0, clarifications:0, items:{}};
  if(!S.queries) S.queries = [
    {id:"WW-Q-1041", cat:"Item not recognized", text:"It could not identify my old calculator.", status:"investigating", loc:"Hostel Block", item:"Calculator", date:"2d ago"},
    {id:"WW-Q-1040", cat:"Bin issue", text:"The special bin near the hostel is always full.", status:"resolved", loc:"Hostel Block", item:"Battery", date:"4d ago"}
  ];
}

/* ---------- utils ---------- */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function toast(msg, ms=2600){ const el=$("toast"); el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add("hidden"), ms); }

/* ---------- i18n apply ---------- */
function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{ el.placeholder = t(el.dataset.i18nPh); });
  $("set-lang-val").textContent = {en:"English",te:"తెలుగు",hi:"हिन्दी"}[S.lang]+" ›";
  document.documentElement.lang = S.lang;
}
function setLang(l){ S.lang=l; save(); applyI18n(); renderGuide(); renderQueries(); toast({en:"Language: English",te:"భాష: తెలుగు",hi:"भाषा: हिन्दी"}[l]); }

/* ---------- router (internal nav stack) ---------- */
const NAV_STACK = [];
function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $(id).classList.add("active");
  S.screen = id;
  if(id==="screen-camera") startCamera(); else stopCamera();
  if(id==="screen-guide") renderGuide();
  if(id==="screen-queries") renderQueries();
  if(id==="screen-insights") renderInsights();
  if(id==="screen-admin") adminTab("overview");
  window.scrollTo(0,0);
}
function go(id){ if(S.screen && S.screen!==id && !id.startsWith("screen-offline")) NAV_STACK.push(S.screen); show(id); }
function goBack(){ const prev = NAV_STACK.pop() || "screen-home"; show(prev); }

/* =========================================================
   SERVICES (interfaces — mock implementations for prototype)
   ========================================================= */
const PrivacyGuard = {
  clean(text){ return String(text).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,"[email removed]")
                                  .replace(/(\+?\d[\d\s-]{8,}\d)/g,"[phone removed]"); }
};
const MockVisionService = {            // → replace with POST /api/vision
  async detect(label){
    await sleep(1200);
    const item = KB.find(x=>x.n.toLowerCase()===label.toLowerCase());
    return item ? {item, confidence:item.c} : {item:null, confidence:0};
  }
};
const MockRAGService = {               // → replace with vector DB + POST /api/rag
  retrieve(query, item){
    let hits = [];
    if(item){
      const bin = STREAMS[item.s] ? STREAMS[item.s].bin : "dry";
      hits = LOCAL_RULES.filter(r => r.id==="R6" ? false :
        (bin==="wet" && r.id==="R1") || (bin==="dry" && r.id==="R2") ||
        (bin==="special" && r.id==="R3") || (item.k.some(k=>r.text.toLowerCase().includes(k)) ));
      if(!hits.length) hits = [LOCAL_RULES.find(r=>r.id==="R6")];
    } else {
      const q = query.toLowerCase();
      hits = LOCAL_RULES.filter(r=>r.text.toLowerCase().split(/\s+/).some(w=>q.includes(w)&&w.length>3));
      if(!hits.length) hits = [LOCAL_RULES[5]];
    }
    return hits.slice(0,3).map((r,i)=>({...r, score:(0.97-i*0.08).toFixed(2)}));
  }
};
const MockGraniteService = {           // → replace with POST /api/granite (watsonx.ai)
  async generate({item, rule, binKey, lang}){
    await sleep(900);
    const bin = BINS[binKey] || BINS.dry;
    const g = {
      en:{ place:`Place the ${item.n.toLowerCase()} in the ${bin.label} / ${bin.sub.toLowerCase()} bin.`,
           reason:`The item is identified as ${(STREAMS[item.s]||{name:"Dry / Other"}).name.toLowerCase()} under the configured local rule.` },
      te:{ place:`${item.n}ను ${bin.label==="WET"?"తేమ":bin.label==="DRY"?"పొడి":"ప్రత్యేక"} బిన్‌లో వేయండి.`,
           reason:`ఈ వస్తువు స్థానిక నియమం ప్రకారం ${(STREAMS[item.s]||{name:"Dry / Other"}).name}గా గుర్తించబడింది.` },
      hi:{ place:`${item.n} को ${bin.label==="WET"?"गीले":bin.label==="DRY"?"सूखे":"विशेष"} बिन में डालें।`,
           reason:`यह वस्तु स्थानीय नियम के अनुसार ${(STREAMS[item.s]||{name:"Dry / Other"}).name} के रूप में पहचानी गई है।` }
    }[lang] || {};
    return { item:item.n, category:(STREAMS[item.s]||{name:"Dry / Other"}).name, decision:"answer", bin:binKey,
      preparation:item.prep, reason:g.reason, spoken:g.place, source:`${rule.src} · ${rule.sec}`,
      confidence:item.c };
  }
};
const TextToSpeechService = {          // → replaceable with any TTS provider
  speak(text, lang){
    lastAIText = text;
    if(S.muted || !("speechSynthesis" in window)) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = {en:"en-US",te:"te-IN",hi:"hi-IN"}[lang]||"en-US";
      u.rate = 0.95;
      speaking = true; setStatus("status_speaking");
      u.onend = ()=>{ speaking=false; setStatus("status_ready"); };
      speechSynthesis.speak(u);
    }catch(e){}
  },
  stop(){ try{ speechSynthesis.cancel(); }catch(e){} speaking=false; }
};
const AnalyticsService = {             // → replace with POST /api/insights
  trackScan(item){ S.analytics.scans++; S.analytics.items[item.n]=(S.analytics.items[item.n]||0)+1; save(); },
  trackFeedback(ok){ ok?S.analytics.helpful++:S.analytics.notHelpful++; save(); },
  trackNotSure(){ S.analytics.notsure++; save(); },
  trackClarify(){ S.analytics.clarifications++; save(); }
};
const QueryService = {                 // → replace with POST /api/query
  submit(q){ q.id = "WW-Q-"+(++S.qSeq); q.status="open"; S.queries.unshift(q); save(); return q; }
};

/* =========================================================
   CAMERA
   ========================================================= */
async function startCamera(){
  const vid = $("cam-video"), fb = $("cam-fallback");
  if(camStream){ fb.classList.add("hidden"); vid.classList.remove("hidden"); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ fb.classList.remove("hidden"); vid.classList.add("hidden"); return; }
  try{
    camStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}, audio:false});
    vid.srcObject = camStream; fb.classList.add("hidden"); vid.classList.remove("hidden");
  }catch(e){
    fb.classList.remove("hidden"); vid.classList.add("hidden");
  }
}
function stopCamera(){ if(camStream){ camStream.getTracks().forEach(tr=>tr.stop()); camStream=null; $("cam-video").srcObject=null; } }

/* =========================================================
   PIPELINE VISUALIZATION
   ========================================================= */
const PIPE_STEPS = [["📷","Camera"],["👁","Identifying"],["🔎","Finding local rule"],["🧠","Reasoning"],["🗑","Mapping to bin"],["🔊","Preparing response"]];
async function runPipeline(activeCount){
  const ov = $("pipeline-overlay"), box = $("pipeline-steps");
  box.innerHTML = PIPE_STEPS.map((s,i)=>`<div class="pstep" data-i="${i}"><span class="pi">${i+1}</span> ${s[0]} ${s[1]}</div>`).join("");
  ov.classList.remove("hidden");
  for(let i=0;i<Math.min(activeCount,PIPE_STEPS.length);i++){
    const el = box.querySelector(`[data-i="${i}"]`);
    el.classList.add("active");
    await sleep(520);
    el.classList.remove("active"); el.classList.add("done"); el.querySelector(".pi").textContent="✓";
  }
  await sleep(260);
  ov.classList.add("hidden");
}
function setStatus(key){ const el=$("ai-status-text"); if(el) el.textContent = t(key); }

/* =========================================================
   CAPTIONS & CONVERSATION
   ========================================================= */
function addCaption(who, text){
  const box = $("captions");
  box.insertAdjacentHTML("beforeend",
    `<div class="caption ${who==="you"?"you":"ai"}"><span class="who">${who==="you"?t("you"):t("ai_name")}</span>${esc(text)}</div>`);
  box.scrollTop = box.scrollHeight;
}
function clearCaptions(){ $("captions").innerHTML=""; }

/* ---------- simulated listening (STT fallback) ---------- */
function simListen(inline){
  const btn = inline ? null : $("btn-voice");
  if(btn) btn.classList.add("listening");
  setStatus("status_listening");
  toast(t("listening_demo")+" “Where should I put this?”", 2200);
  setTimeout(()=>{
    if(btn) btn.classList.remove("listening");
    const sugg = ["Where should I put this?","What is this?","Why?","Do I need to empty it?","Can this go in dry waste?","This answer seems wrong"];
    const line = sugg[Math.floor(Math.random()*sugg.length)];
    if(inline){ $("cam-text-input").value = line; $("cam-text-input").focus(); }
    else handleUserMessage(line);
  }, 1500);
}
/* real speech recognition when available */
function realListen(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ simListen(); return; }
  try{
    const r = new SR(); r.lang = {en:"en-US",te:"te-IN",hi:"hi-IN"}[S.lang];
    setStatus("status_listening");
    r.onresult = e => handleUserMessage(e.results[0][0].transcript);
    r.onerror = ()=>simListen();
    r.start();
  }catch(e){ simListen(); }
}

/* =========================================================
   AI AGENT — answer / clarify / not-sure
   ========================================================= */
function renderResultView(){
  const item = S.currentItem, ans = S.lastAnswer;
  const body = $("result-body");
  if(!item || !ans){ body.innerHTML = `<p class="muted" style="padding:30px;text-align:center">No result yet — scan an item first.</p>`; return; }
  const bin = BINS[ans.bin];
  const confLbl = ans.confidence>=85?t("high"):ans.confidence>=65?t("medium"):t("low");
  const streamName = STREAMS[item.s] ? STREAMS[item.s].name : item.s;
  const ragHits = S.lastRAG || [];
  body.innerHTML = `
    <div class="item-title">${item.i} ${esc(item.n).toUpperCase()} — ${esc(streamName)}</div>
    <div class="bin-hero bin-${bin.color}">
      <span class="conf">${t("conf_label")}: ${confLbl} · ${ans.confidence}%</span>
      <div class="bin-icon">${bin.icon}</div>
      <h2>${bin.label}</h2>
      <div class="bin-sub">${bin.sub}</div>
    </div>
    <div class="card"><h4>${t("what_to_do")}</h4><p>${esc(ans.preparation)}</p>
      <p class="muted small" style="margin-top:6px">${esc(ans.spoken)}</p></div>
    <button class="why-toggle" onclick="this.nextElementSibling.classList.toggle('open');this.textContent=this.nextElementSibling.classList.contains('open')?'▾ ${t("why")}':'▸ ${t("why")}'">▸ ${t("why")}</button>
    <div class="why-body">
      <p>${esc(ans.reason)}</p>
      <p style="margin-top:6px"><b>${t("matched_rule")}:</b> “${esc(S.lastRule?S.lastRule.text:"")}”</p>
      <span class="src">📖 ${esc(ans.source)}</span>
      <p style="margin-top:8px" class="small">🧠 ${t("granite_note")}</p>
    </div>
    <div class="card"><h4>${t("top_matches")}</h4>
      ${ragHits.map(h=>`<p class="small" style="margin-bottom:5px">✓ ${esc(h.text)} <span class="muted">(${esc(h.src)} · score ${h.score})</span></p>`).join("")}
    </div>
    <div class="feedback-bar"><span style="flex:1">${t("feedback_ask")}</span>
      <button class="btn btn-primary btn-s" onclick="feedback(true)">👍 ${t("yes")}</button>
      <button class="btn btn-secondary btn-s" onclick="feedback(false)">👎 ${t("no")}</button>
      <button class="btn btn-secondary btn-s" onclick="TextToSpeechService.speak(lastAIText,S.lang)">${t("replay")}</button>
    </div>
    <div id="fb-detail"></div>
    <div class="follow-row big">
      <button class="icon-btn" onclick="simListen(true)">🎙️</button>
      <input id="result-input" placeholder="${esc(t("type_here"))}" onkeydown="if(event.key==='Enter')sendFromResult()">
      <button class="btn btn-primary btn-s" onclick="sendFromResult()">${t("send")}</button>
    </div>
    <div class="result-actions">
      <button class="btn btn-secondary" onclick="go('screen-camera')">${t("scan_another")}</button>
      <button class="btn btn-secondary" onclick="openQueryForm(true)">${t("query_btn")}</button>
      <button class="btn btn-secondary" onclick="go('screen-guide')">${t("view_bin_guide")}</button>
      <button class="btn btn-secondary" onclick="TextToSpeechService.stop()">${t("stop")}</button>
    </div>`;
}

function showAnswer(item, rule, hits){
  const binKey = STREAMS[item.s] ? STREAMS[item.s].bin : "dry";
  return MockGraniteService.generate({item, rule, binKey, lang:S.lang}).then(ans=>{
    S.lastAnswer = ans; S.lastRAG = hits; S.lastRule = rule;
    addCaption("ai", ans.spoken);
    renderResultView();
    go("screen-result");
    TextToSpeechService.speak(ans.spoken, S.lang);
  });
}

async function identifyAndAnswer(item, viaCamera){
  setStatus("status_identifying");
  await runPipeline(viaCamera?6:4);
  const hits = MockRAGService.retrieve(item.n, item);
  const rule = hits[0];
  AnalyticsService.trackScan(item);
  S.currentItem = item;
  addCaption("ai", `${t("scan_of")}: ${item.n}`);
  await showAnswer(item, rule, hits);
}

async function demoScan(label){
  if(!label) { toast("Pick a demo item first"); return; }
  setStatus("status_scanning");
  await sleep(900);
  const res = await MockVisionService.detect(label);
  if(!res.item){ showNotSure(); return; }
  await identifyAndAnswer(res.item, true);
}

function showClarify(){
  AnalyticsService.trackClarify();
  addCaption("ai", t("clarify_plastic"));
  const body = $("result-body");
  body.innerHTML = `
    <div class="decision-banner decision-clarify">🤔 <b>WasteWise AI:</b> ${t("clarify_plastic")}</div>
    <div class="card"><div class="chips" style="margin-top:0">
      ${["Plastic Bottle","Plastic Wrapper / Chips Packet","Plastic Container","Bubble Wrap"].map(x=>`<button onclick='demoScan("${x}")'>${x}</button>`).join("")}
      <button onclick="showNotSure()">Other…</button>
    </div></div>
    <div class="follow-row big">
      <input id="result-input" placeholder="${esc(t("type_here"))}" onkeydown="if(event.key==='Enter')sendFromResult()">
      <button class="btn btn-primary btn-s" onclick="sendFromResult()">${t("send")}</button>
    </div>`;
  S.currentItem = null; S.lastAnswer = null;
  go("screen-result");
}

function showNotSure(){
  AnalyticsService.trackNotSure();
  addCaption("ai", t("not_sure_title"));
  const body = $("result-body");
  body.innerHTML = `
    <div class="decision-banner decision-notsure">${t("not_sure_title")}<br><span class="muted small">${t("not_sure_sub")}</span></div>
    <div class="result-actions">
      <button class="btn btn-secondary" onclick="go('screen-camera')">${t("ask_again")}</button>
      <button class="btn btn-secondary" onclick="openQueryForm(true)">${t("query_btn")}</button>
      <button class="btn btn-secondary" onclick="go('screen-guide')">${t("view_bin_guide")}</button>
      <button class="btn btn-secondary" onclick="go('screen-home')">${t("back_home")}</button>
    </div>`;
  S.lastAnswer = null;
  go("screen-result");
  TextToSpeechService.speak(t("not_sure_title"), S.lang);
}

/* ---------- natural-language intent handling with memory ---------- */
async function handleUserMessage(raw){
  const text = PrivacyGuard.clean(raw).trim();
  if(!text) return;
  addCaption("you", text);
  const q = text.toLowerCase();
  setStatus("status_thinking");

  /* query / complaint detection */
  if(/wrong|differently|mismatch|not correct|incorrect|issue|question|campus.*(rule|tell)/.test(q)){
    addCaption("ai", t("query_offer"));
    if(confirm(t("query_offer"))){ openQueryForm(true, text); return; }
    addCaption("ai", t("continue_chat")); setStatus("status_ready"); return;
  }
  /* not-sure request */
  if(/not sure|don't know|dont know|unknown/.test(q)){ showNotSure(); return; }
  /* clarify trigger: vague plastic */
  if(/^plastics?$/.test(q.trim())){ showClarify(); return; }
  /* "why" → reason for current item */
  if(/\bwhy\b/.test(q) && S.lastAnswer){
    addCaption("ai", S.lastAnswer.reason + " — " + (S.lastRule?S.lastRule.text:""));
    setStatus("status_ready"); return;
  }
  /* preparation questions */
  if(/empty|rinse|wash|prepare|crush|cap/.test(q) && S.currentItem){
    addCaption("ai", S.currentItem.prep);
    TextToSpeechService.speak(S.currentItem.prep, S.lang);
    setStatus("status_ready"); return;
  }
  /* "where / bin / put" → bin answer for current item */
  if(/where|bin|put|dispose|throw|goes/.test(q) && S.currentItem && S.lastAnswer){
    const bin = BINS[S.lastAnswer.bin];
    const msg = S.lastAnswer.spoken;
    addCaption("ai", msg);
    TextToSpeechService.speak(msg, S.lang);
    setStatus("status_ready"); return;
  }
  /* greeting */
  if(/^(hi|hello|hey|namaste|namaskaram)\b/.test(q)){
    addCaption("ai", {en:"Hello! Show me your waste or ask me anything about disposal.",te:"నమస్కారం! మీ చెత్తను చూపండి లేదా వదిలించుకోవడం గురించి అడగండి.",hi:"नमस्ते! मुझे अपना कचरा दिखाएं या निपटान के बारे में पूछें."}[S.lang]);
    setStatus("status_ready"); return;
  }
  /* KB lookup */
  const found = KB.find(x => q.includes(x.n.toLowerCase()) || x.k.some(k=>q.includes(k)));
  if(found){ await identifyAndAnswer(found, false); return; }
  /* partial: "plastic" inside longer vague text → clarify */
  if(/\bplastic\b/.test(q) && !S.currentItem){ showClarify(); return; }
  /* fallback */
  showNotSure();
}

function sendFromCamera(){ const el=$("cam-text-input"); if(el.value.trim()){ handleUserMessage(el.value); el.value=""; } }
function sendFromResult(){ const el=$("result-input"); if(el && el.value.trim()){ handleUserMessage(el.value); el.value=""; } }
function sendTyped(){ const el=$("type-input"); if(el.value.trim()){ go('screen-camera'); setTimeout(()=>handleUserMessage(el.value),300); } }

/* =========================================================
   FEEDBACK
   ========================================================= */
function feedback(ok){
  AnalyticsService.trackFeedback(ok);
  const box = $("fb-detail");
  if(ok){ box.innerHTML = `<div class="card" style="border-color:var(--green)">✅ ${t("thanks_feedback")}</div>`; toast(t("thanks_feedback")); return; }
  box.innerHTML = `<div class="card"><h4>${t("what_wrong")}</h4>
    ${[["fb_wrong_bin"],["fb_wrong_item"],["fb_rule"],["fb_unclear"],["fb_other"]].map(([k])=>`<button class="fb-opt" onclick="submitFeedbackReason('${t(k)}')">${t(k)}</button>`).join("")}
    </div>`;
}
function submitFeedbackReason(reason){
  $("fb-detail").innerHTML = `<div class="card" style="border-color:var(--green)">✅ ${t("thanks_feedback")}</div>`;
  toast(t("thanks_feedback"));
}

/* =========================================================
   QUERY CENTRE
   ========================================================= */
function openQueryForm(fromContext, presetText){
  go("screen-query-form");
  if(presetText) $("q-text").value = presetText;
  else if(fromContext && S.currentItem)
    $("q-text").value = `Item: ${S.currentItem.n} | AI recommended: ${S.lastAnswer?S.lastAnswer.bin:"—"} | Location: ${locName()}\n`;
}
function locName(){ const l = LOCATIONS.find(x=>x.id===S.location); return l?l.name:"Campus Cafeteria"; }
function submitQuery(){
  const text = $("q-text").value.trim();
  if(!text){ toast("Please describe the issue"); return; }
  const q = QueryService.submit({
    cat: $("q-category").value, text,
    item: ($("q-attach").checked && S.currentItem) ? S.currentItem.n : null,
    ans: ($("q-attach").checked && S.lastAnswer) ? S.lastAnswer.bin : null,
    loc: locName(), date: "just now"
  });
  $("q-text").value = "";
  $("query-id").textContent = q.id;
  go("screen-query-done");
}
function renderQueries(){
  $("query-list").innerHTML = S.queries.map(q=>`
    <div class="q-item"><div class="q-head"><span class="q-id">${q.id}</span>
    <span class="status ${q.status==="open"?"open":q.status==="investigating"?"invest":"resolved"}">${q.status.toUpperCase()}</span></div>
    <p>${esc(q.text)}</p><div class="q-meta">🏷 ${esc(q.cat)} · 📍 ${esc(q.loc)}${q.item?" · 🗑 "+esc(q.item):""} · ${esc(q.date)}</div></div>`).join("")
    || `<p class="muted">No queries yet.</p>`;
}

/* =========================================================
   BIN GUIDE
   ========================================================= */
function binOf(item){ return BINS[STREAMS[item.s] ? STREAMS[item.s].bin : "dry"]; }
function renderGuide(){
  const q = ($("guide-search").value||"").toLowerCase();
  const list = KB.filter(x => !q || x.n.toLowerCase().includes(q) || x.k.some(k=>k.includes(q)));
  $("guide-list").innerHTML = list.map(x=>{ const b=binOf(x); return `
    <button class="guide-item" onclick='identifyAndAnswer(KB.find(k=>k.n===${JSON.stringify(x.n)}),false)'>
      <span class="gi-icon">${x.i}</span><b>${esc(x.n)}</b>
      <span class="bin-dot ${b.color[0]}"></span><span class="small muted">${b.label}</span></button>`; }).join("");
  if(!list.length) $("guide-list").innerHTML = `<p class="muted">No match — try the Query Centre.</p>`;
}

/* =========================================================
   INSIGHTS DASHBOARD
   ========================================================= */
function renderInsights(){
  $("insight-cards").innerHTML = `
    <div class="stat g"><div class="s-val">${DEMO_STATS.totalScans + S.analytics.scans}</div><div class="s-lbl">${t("total_scans")}</div></div>
    <div class="stat b"><div class="s-val">${DEMO_STATS.correct}%</div><div class="s-lbl">${t("correct_feedback")}</div></div>
    <div class="stat a"><div class="s-val">${DEMO_STATS.review}%</div><div class="s-lbl">${t("needs_review")}</div></div>
    <div class="stat r"><div class="s-val">${DEMO_STATS.notsure}%</div><div class="s-lbl">${t("not_sure_rate")}</div></div>`;
  const chart = (title, rows, cls="") => `<div class="chart"><h4>${title}</h4>${rows.map(([l,v])=>`
    <div class="bar-row"><span class="bl">${l}</span><span class="bar-track"><span class="bar-fill ${cls}" style="width:0" data-w="${v}"></span></span><span class="bv">${v}%</span></div>`).join("")}</div>`;
  $("insight-charts").innerHTML =
    chart("🗑 "+t("bin_guide")+" — "+{en:"categories scanned",te:"స్కాన్ చేసిన వర్గాలు",hi:"स्कैन की गई श्रेणियां"}[S.lang], DEMO_CHARTS.categories)+
    chart("🤔 "+{en:"Most confusing items",te:"అత్యంత గందరగోళ వస్తువులు",hi:"सबसी confusing वस्तुएं"}[S.lang], DEMO_CHARTS.confusing,"blue")+
    chart("👍 "+{en:"Feedback",te:"ఫీడ్‌బ్యాక్",hi:"फीडबैक"}[S.lang], DEMO_CHARTS.feedback)+
    chart("❓ "+{en:"Query categories",te:"క్వెరీ వర్గాలు",hi:"क्वेरी श्रेणियां"}[S.lang], DEMO_CHARTS.queries,"red")+
    chart("🌐 "+{en:"Language usage",te:"భాష వినియోగం",hi:"भाषा उपयोग"}[S.lang], DEMO_CHARTS.languages,"blue");
  requestAnimationFrame(()=>setTimeout(()=>document.querySelectorAll(".bar-fill").forEach(b=>b.style.width=b.dataset.w+"%"),60));
}
function exportCSV(){
  const rows = [["item","scans"],...Object.entries(S.analytics.items)];
  const csv = rows.map(r=>r.join(",")).join("\n");
  try{
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "wastewise-anonymous-insights.csv"; a.click();
  }catch(e){ toast(csv); }
}

/* =========================================================
   ADMIN
   ========================================================= */
function adminTab(tab){
  document.querySelectorAll(".atab").forEach(b=>b.classList.toggle("on", b.dataset.tab===tab));
  const body = $("admin-body");
  if(tab==="overview"){
    body.innerHTML = `<div class="demo-note">⚠️ ${t("demo_data_label")}</div>
    <div class="stat-grid">
      <div class="stat g"><div class="s-val">${DEMO_STATS.totalScans}</div><div class="s-lbl">${t("total_scans")}</div></div>
      <div class="stat b"><div class="s-val">${DEMO_STATS.correct}%</div><div class="s-lbl">${t("correct_feedback")}</div></div>
      <div class="stat a"><div class="s-val">${DEMO_STATS.review}%</div><div class="s-lbl">${t("needs_review")}</div></div>
      <div class="stat r"><div class="s-val">${DEMO_STATS.notsure}%</div><div class="s-lbl">${t("not_sure_rate")}</div></div>
    </div>
    <div class="card"><h4>🔥 Hotspots</h4><p class="small">📍 Cafeteria — plastic wrapper confusion<br>📍 Hostel — battery disposal questions</p></div>`;
  }
  if(tab==="queries"){
    body.innerHTML = S.queries.map((q,i)=>`
      <div class="q-item"><div class="q-head"><span class="q-id">${q.id}</span>
      <span class="status ${q.status==="open"?"open":q.status==="investigating"?"invest":"resolved"}">${q.status.toUpperCase()}</span></div>
      <p>${esc(q.text)}</p><div class="q-meta">🏷 ${esc(q.cat)} · 📍 ${esc(q.loc)}${q.item?" · 🗑 "+esc(q.item):""}</div>
      <div class="q-admin-actions">
        ${q.status!=="investigating"?`<button onclick="setQStatus(${i},'investigating')">Mark Investigating</button>`:""}
        ${q.status!=="resolved"?`<button onclick="setQStatus(${i},'resolved')">Mark Resolved</button>`:""}
      </div></div>`).join("");
  }
  if(tab==="locations"){
    body.innerHTML = LOCATIONS.map(l=>`
      <div class="card loc-card"><h4>📍 ${l.name}</h4>
      <p class="small">Bins: ${l.bins.map(b=>BINS[b].icon+" "+BINS[b].label).join(" · ")}<br>Contact: ${l.contact}</p>
      <div class="qr" data-qr="${l.id}"></div>
      <p class="small muted" style="text-align:center">QR → /scan?location=${l.id}</p></div>`).join("");
    document.querySelectorAll(".qr").forEach(drawQR);
  }
  if(tab==="bins"){
    body.innerHTML = `<div class="demo-note">🗑️ Map the 8 internal streams to physical bins (configurable per location) — not a universal legal standard.</div>` +
      Object.entries(STREAMS).map(([k,s])=>`
      <div class="map-row"><span style="flex:1">${s.name}</span>
      <select onchange="STREAMS['${k}'].bin=this.value">
        ${Object.values(BINS).map(b=>`<option value="${b.key}" ${s.bin===b.key?"selected":""}>${b.icon} ${b.label}</option>`).join("")}
      </select></div>`).join("") +
      `<p class="hint">Changes apply to new scans immediately (prototype behaviour).</p>`;
  }
  if(tab==="knowledge"){
    body.innerHTML = `<input class="search" placeholder="Search items…" oninput="filterKB(this.value)">
      <div class="kb-scroll"><table class="kb" id="kb-table"><thead><tr><th>Item</th><th>Stream</th><th>Rule</th><th>Source</th></tr></thead>
      <tbody>${KB.map(x=>{const st=STREAMS[x.s]||{name:"Dry / Other",bin:"dry"};const r = LOCAL_RULES.find(r=>r.id===(st.bin==="wet"?"R1":st.bin==="dry"?"R2":"R3"));return `<tr><td>${x.i} ${x.n}</td><td>${st.name}</td><td class="small">${x.prep}</td><td class="small muted">${r.src} ${r.sec}</td></tr>`;}).join("")}</tbody></table></div>
      <p class="hint">${KB.length} item types · 8 internal streams</p>`;
  }
}
function setQStatus(i,st){ S.queries[i].status=st; save(); adminTab("queries"); renderQueries(); toast("Query "+S.queries[i].id+" → "+st); }
function filterKB(q){ q=q.toLowerCase(); document.querySelectorAll("#kb-table tbody tr").forEach(tr=>{ tr.style.display = tr.textContent.toLowerCase().includes(q)?"":"none"; }); }
function drawQR(el){
  let seed = [...el.dataset.qr].reduce((a,c)=>a+c.charCodeAt(0),7);
  const rnd = ()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  let html=""; for(let i=0;i<81;i++) html+=`<i class="${rnd()>0.5?"":"w"}"></i>`;
  el.innerHTML = html;
}

/* =========================================================
   SETTINGS / MISC
   ========================================================= */
function toggleMute(){ S.muted=!S.muted; if(S.muted) TextToSpeechService.stop(); save();
  ["btn-cam-mute"].forEach(id=>{const e=$(id); if(e) e.textContent=S.muted?"🔇":"🔊";});
  const sm=$("set-mute"); if(sm) sm.textContent = S.muted?"🔇 Off":"🔊 On"; }
function renderSettings(){ const sm=$("set-mute"); if(sm) sm.textContent=S.muted?"🔇 Off":"🔊 On"; }
function setCaptionSize(sz){ S.captionSize=sz; save();
  document.body.classList.remove("cap-small","cap-large");
  if(sz!=="medium") document.body.classList.add("cap-"+sz);
  document.querySelectorAll("#caption-seg button").forEach((b,i)=>b.classList.toggle("on",["small","medium","large"][i]===sz)); }

function updateOnline(){
  S.offline = !navigator.onLine;
  $("offline-banner").classList.toggle("hidden", !S.offline);
  if(S.offline && S.screen==="screen-camera") go("screen-offline");
}
window.addEventListener("online", ()=>{ updateOnline(); toast("Back online"); });
window.addEventListener("offline", updateOnline);

/* =========================================================
   BOOT
   ========================================================= */
function boot(){
  load();
  /* location via QR simulation: /scan?location=cafeteria */
  const loc = new URLSearchParams(location.search).get("location");
  if(loc && LOCATIONS.some(l=>l.id===loc)){ S.location = loc; setTimeout(()=>toast("📍 QR scanned — "+locName()+" configuration loaded"), 1200); }
  /* demo item options */
  $("demo-item").innerHTML = `<option value="">— select —</option>` +
    ["Banana Peel","Apple Core","Food Leftovers","Plastic Bottle","Plastic Wrapper / Chips Packet","Paper","Cardboard","Aluminium Can","Glass Bottle","Battery","Old Phone / E-waste","Medicine Packaging","Sanitary Waste","Tea Waste / Coffee Grounds","Plastic Cup".replace("Plastic Cup","Paper Cup (clean)"),"Tetra Pak"].map(x=>`<option>${x}</option>`).join("");
  /* type suggestions */
  $("type-suggest").innerHTML = ["old battery","plastic bottle","banana peel","paper cup","food waste","glass bottle"].map(x=>`<button onclick="$('type-input').value='${x}';sendTyped()">${x}</button>`).join("");
  /* responsible-ai evidence card */
  $("why-answer").innerHTML = `<h4 style="font-size:12px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">${t("why")}</h4>
    <p class="small">🗑 Detected item → category → matched local rule → physical bin → source. Only this safe summary is shown — never hidden chain-of-thought.</p>`;
  document.getElementById("btn-start").addEventListener("click", ()=>go("screen-home"));
  /* replace inline handler with a single listener (real STT where available) */
  const oldV = $("btn-voice"), nv = oldV.cloneNode(true);
  nv.removeAttribute("onclick");              /* avoid double-firing with inline handler */
  oldV.parentNode.replaceChild(nv, oldV);
  nv.addEventListener("click", ()=>{ (window.SpeechRecognition||window.webkitSpeechRecognition) ? realListen() : simListen(); });
  if(S.muted){ $("btn-cam-mute").textContent = "🔇"; }
  applyI18n(); setCaptionSize(S.captionSize||"medium"); renderSettings(); updateOnline();
}
document.addEventListener("DOMContentLoaded", boot);
