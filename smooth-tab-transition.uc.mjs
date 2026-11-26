/*
 * Smooth Tab Transition v4.0.0
 * Zen Browser + Sine
 *
 * UI: a dedicated in-browser settings panel opened by a toolbar button.
 * Settings are stored in Services.prefs and applied live.
 *
 * NOTE: Zen's chrome DOM and Split View internals can vary between releases.
 * Test in a separate Zen profile before using as your daily configuration.
 */
(() => {
  "use strict";
  const VERSION = "4.0.0";
  if (window.__smoothTabTransitionV4) return;
  window.__smoothTabTransitionV4 = true;

  const PREFIX = "smooth-tab-transition.v4.";
  const CURVES = {
    "Linear": [0, 0, 1, 1],
    "Ease In": [0.42, 0, 1, 1],
    "Ease Out": [0, 0, 0.58, 1],
    "Ease In Out": [0.42, 0, 0.58, 1],
    "Ease In Cubic": [0.55, 0.055, 0.675, 0.19],
    "Ease Out Cubic": [0.215, 0.61, 0.355, 1],
    "Ease In Out Cubic": [0.645, 0.045, 0.355, 1],
    "Ease In Quart": [0.895, 0.03, 0.685, 0.22],
    "Ease Out Quart": [0.165, 0.84, 0.44, 1],
    "Ease In Out Quart": [0.77, 0, 0.175, 1],
    "Ease In Quint": [0.755, 0.05, 0.855, 0.06],
    "Ease Out Quint": [0.23, 1, 0.32, 1],
    "Ease In Out Quint": [0.86, 0, 0.07, 1],
    "Sine In": [0.12, 0, 0.39, 0],
    "Sine Out": [0.61, 1, 0.88, 1],
    "Sine In Out": [0.37, 0, 0.63, 1],
    "Expo In": [0.7, 0, 0.84, 0],
    "Expo Out": [0.16, 1, 0.3, 1],
    "Expo In Out": [0.87, 0, 0.13, 1],
    "Circ In": [0.6, 0.04, 0.98, 0.335],
    "Circ Out": [0.075, 0.82, 0.165, 1],
    "Circ In Out": [0.785, 0.135, 0.15, 0.86],
    "Back In": [0.6, -0.28, 0.735, 0.045],
    "Back Out": [0.175, 0.885, 0.32, 1.275],
    "Back In Out": [0.68, -0.55, 0.265, 1.55],
    "Snappy": [0.16, 1, 0.3, 1],
    "Smooth": [0.22, 1, 0.36, 1],
    "Cinematic": [0.19, 1, 0.22, 1],
    "Soft": [0.4, 0, 0.2, 1],
    "Elastic In": "elastic-in",
    "Elastic Out": "elastic-out",
    "Elastic In Out": "elastic-in-out",
    "Bounce In": "bounce-in",
    "Bounce Out": "bounce-out",
    "Bounce In Out": "bounce-in-out",
    "Custom": "custom"
  };

  const PRESETS = {
    tab: {
      "Snappy": { duration: 230, exitDuration: 170, enterDuration: 230, scale: 0.975, blur: 4, opacity: 0.72, x: 0, y: 0, rotation: 0, perspective: 900, delay: 0, exitDelay: 0, enterDelay: 0, curve: "Snappy", direction: "center", overshoot: false },
      "Smooth": { duration: 430, exitDuration: 300, enterDuration: 430, scale: 0.965, blur: 7, opacity: 0.58, x: 0, y: 0, rotation: 0, perspective: 1000, delay: 0, exitDelay: 0, enterDelay: 0, curve: "Smooth", direction: "center", overshoot: false },
      "Cinematic": { duration: 720, exitDuration: 520, enterDuration: 720, scale: 0.94, blur: 12, opacity: 0.35, x: 0, y: 12, rotation: 0, perspective: 1200, delay: 0, exitDelay: 0, enterDelay: 30, curve: "Cinematic", direction: "center", overshoot: false },
      "Subtle": { duration: 300, exitDuration: 220, enterDuration: 300, scale: 0.99, blur: 2, opacity: 0.85, x: 0, y: 0, rotation: 0, perspective: 900, delay: 0, exitDelay: 0, enterDelay: 0, curve: "Ease Out", direction: "center", overshoot: false },
      "Dynamic": { duration: 500, exitDuration: 300, enterDuration: 500, scale: 0.93, blur: 9, opacity: 0.5, x: 24, y: 0, rotation: 1.2, perspective: 1000, delay: 0, exitDelay: 0, enterDelay: 0, curve: "Back Out", direction: "right", overshoot: true },
      "Custom": {}
    },
    loading: {
      "Snappy": { duration: 180, minimumDuration: 180, maximumDuration: 12000, startDelay: 0, completionDelay: 0, scale: 0.99, blur: 3, opacity: 0.78, x: 0, y: 0, curve: "Snappy", direction: "center" },
      "Smooth": { duration: 420, minimumDuration: 250, maximumDuration: 15000, startDelay: 40, completionDelay: 60, scale: 0.975, blur: 7, opacity: 0.58, x: 0, y: 0, curve: "Smooth", direction: "center" },
      "Cinematic": { duration: 700, minimumDuration: 500, maximumDuration: 20000, startDelay: 100, completionDelay: 120, scale: 0.95, blur: 12, opacity: 0.38, x: 0, y: 10, curve: "Cinematic", direction: "center" },
      "Subtle": { duration: 280, minimumDuration: 180, maximumDuration: 10000, startDelay: 80, completionDelay: 0, scale: 0.995, blur: 2, opacity: 0.9, x: 0, y: 0, curve: "Ease Out", direction: "center" },
      "Custom": {}
    }
  };

  const DEFAULTS = {
    enabled: true, animateSplit: true, respectReducedMotion: true,
    tabPreset: "Smooth", tabDuration: 430, tabExitDuration: 300, tabEnterDuration: 430,
    tabScale: 0.965, tabBlur: 7, tabOpacity: 0.58, tabX: 0, tabY: 0,
    tabRotation: 0, tabPerspective: 1000, tabDelay: 0, tabExitDelay: 0,
    tabEnterDelay: 0, tabCurve: "Smooth", tabDirection: "center", tabOvershoot: false,
    loadingEnabled: true, loadingPreset: "Smooth", loadingDuration: 420,
    loadingMinimumDuration: 250, loadingMaximumDuration: 15000, loadingStartDelay: 40,
    loadingCompletionDelay: 60, loadingTimeout: 18000, loadingScale: 0.975,
    loadingBlur: 7, loadingOpacity: 0.58, loadingX: 0, loadingY: 0,
    loadingCurve: "Smooth", loadingDirection: "center", splitLoadingMode: "all",
    tabCurveX1: 0.22, tabCurveY1: 1, tabCurveX2: 0.36, tabCurveY2: 1,
    loadingCurveX1: 0.22, loadingCurveY1: 1, loadingCurveX2: 0.36, loadingCurveY2: 1
  };

  const TYPES = {};
  for (const [k, v] of Object.entries(DEFAULTS)) TYPES[k] = typeof v;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function read(key) {
    const fallback = DEFAULTS[key];
    try {
      if (typeof fallback === "boolean") return Services.prefs.getBoolPref(PREFIX + key, fallback);
      if (typeof fallback === "number") {
        const raw = Services.prefs.getStringPref(PREFIX + key, String(fallback));
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
      }
      return Services.prefs.getStringPref(PREFIX + key, String(fallback));
    } catch { return fallback; }
  }
  function write(key, value) {
    const type = TYPES[key];
    try {
      if (type === "boolean") Services.prefs.setBoolPref(PREFIX + key, !!value);
      else Services.prefs.setStringPref(PREFIX + key, String(value));
    } catch (e) { console.error("[Smooth Tab Transition] Preference write failed", key, e); }
  }
  function settings() {
    const out = {};
    for (const key of Object.keys(DEFAULTS)) out[key] = read(key);
    return out;
  }

  function applyPreset(section, name) {
    const data = PRESETS[section][name];
    if (!data || name === "Custom") { write(section === "tab" ? "tabPreset" : "loadingPreset", "Custom"); return; }
    const prefix = section === "tab" ? "tab" : "loading";
    for (const [key, value] of Object.entries(data)) {
      const prefKey = prefix + key[0].toUpperCase() + key.slice(1);
      if (Object.hasOwn(DEFAULTS, prefKey)) write(prefKey, value);
    }
    write(prefix + "Preset", name);
    if (section === "tab") {
      const c = CURVES[data.curve];
      if (Array.isArray(c)) ["X1","Y1","X2","Y2"].forEach((p,i) => write("tabCurve"+p,c[i]));
    } else {
      const c = CURVES[data.curve];
      if (Array.isArray(c)) ["X1","Y1","X2","Y2"].forEach((p,i) => write("loadingCurve"+p,c[i]));
    }
  }

  function detectPreset(section) {
    const prefix = section === "tab" ? "tab" : "loading";
    const current = settings();
    const curveName = current[prefix + "Curve"];
    for (const [name, values] of Object.entries(PRESETS[section])) {
      if (name === "Custom") continue;
      let match = true;
      for (const [key, expected] of Object.entries(values)) {
        const actualKey = prefix + key[0].toUpperCase() + key.slice(1);
        if (!Object.hasOwn(DEFAULTS, actualKey)) continue;
        const actual = current[actualKey];
        if (typeof expected === "number" ? Math.abs(Number(actual) - expected) > 0.0001 : actual !== expected) { match = false; break; }
      }
      if (match && curveName === values.curve) return name;
    }
    return "Custom";
  }

  function curveValue(name, t, section) {
    if (name === "Elastic In" || name === "Elastic Out" || name === "Elastic In Out") {
      const c = 2 * Math.PI / 3;
      if (name === "Elastic In") return t === 0 || t === 1 ? t : -Math.pow(2, 10*t-10) * Math.sin((t*10-10.75)*c);
      if (name === "Elastic Out") return t === 0 || t === 1 ? t : Math.pow(2, -10*t) * Math.sin((t*10-0.75)*c) + 1;
      const c2 = 2 * Math.PI / 4.5;
      return t === 0 || t === 1 ? t : t < .5 ? -(Math.pow(2,20*t-10)*Math.sin((20*t-11.125)*c2))/2 : (Math.pow(2,-20*t+10)*Math.sin((20*t-11.125)*c2))/2+1;
    }
    if (name === "Bounce In" || name === "Bounce Out" || name === "Bounce In Out") {
      const bounce = x => { const n=7.5625,d=2.75; if(x<1/d)return n*x*x; if(x<2/d){x-=1.5/d;return n*x*x+.75;} if(x<2.5/d){x-=2.25/d;return n*x*x+.9375;} x-=2.625/d;return n*x*x+.984375; };
      if (name === "Bounce Out") return bounce(t);
      if (name === "Bounce In") return 1-bounce(1-t);
      return t<.5 ? (1-bounce(1-2*t))/2 : (1+bounce(2*t-1))/2;
    }
    let p;
    if (name === "Custom") {
      const s = settings(), pre = section === "tab" ? "tabCurve" : "loadingCurve";
      p = [s[pre+"X1"],s[pre+"Y1"],s[pre+"X2"],s[pre+"Y2"]];
    } else p = CURVES[name] || CURVES.Smooth;
    if (!Array.isArray(p)) p = CURVES.Smooth;
    const [x1,y1,x2,y2] = p;
    const bez = (a,b,t) => 3*a*(1-t)*(1-t)*t + 3*b*(1-t)*t*t + t*t*t;
    let lo=0, hi=1, u=t;
    for(let i=0;i<14;i++){u=(lo+hi)/2; if(bez(x1,x2,u)<t)lo=u;else hi=u;}
    return bez(y1,y2,u);
  }

  function getContainer(tab) {
    return tab?.linkedBrowser?.closest(".browserSidebarContainer") ||
      tab?.linkedBrowser?.parentElement;
  }
  function splitGroup(tab) {
    const g = tab?.group;
    return g?.hasAttribute?.("split-view-group") ? g : null;
  }
  function visualUnit(tab) {
    const group = splitGroup(tab);
    return group?.tabs ? Array.from(group.tabs) : [tab];
  }
  const active = new WeakMap();
  function cancel(element) {
    const a=active.get(element);
    if(a){try{a.cancel();}catch{} active.delete(element);}
  }
  function makeFrames(from, to, section, cfg) {
    const curve = section === "tab" ? cfg.tabCurve : cfg.loadingCurve;
    const frames=[];
    const steps = ["Elastic","Bounce","Back"].some(k => curve.startsWith(k)) ? 50 : 1;
    if (steps === 1) return [from,to];
    for(let i=0;i<=steps;i++){
      const t=i/steps, p=curveValue(curve,t,section);
      const frame={offset:t};
      for(const prop of ["transform","filter","opacity"]){
        const a=from[prop], b=to[prop];
        if(prop==="opacity") frame.opacity=Number(a)+(Number(b)-Number(a))*p;
        else if(prop==="filter"){
          const av=parseFloat(a)||0,bv=parseFloat(b)||0;
          frame.filter=`blur(${av+(bv-av)*p}px)`;
        } else {
          const sa=Number(from._scale??1), sb=Number(to._scale??1);
          const xa=Number(from._x??0), xb=Number(to._x??0), ya=Number(from._y??0), yb=Number(to._y??0);
          const ra=Number(from._rotation??0), rb=Number(to._rotation??0);
          const pa=Number(from._perspective??1000), pb=Number(to._perspective??1000);
          frame.transform=`perspective(${pa+(pb-pa)*p}px) translate3d(${xa+(xb-xa)*p}px,${ya+(yb-ya)*p}px,0) scale(${sa+(sb-sa)*p}) rotate(${ra+(rb-ra)*p}deg)`;
        }
      }
      frames.push(frame);
    }
    return frames;
  }
  function framesFor(section, incoming, cfg) {
    const pre=section==="tab"?"tab":"loading";
    const scale=cfg[pre+"Scale"], blur=cfg[pre+"Blur"], opacity=cfg[pre+"Opacity"];
    let x=cfg[pre+"X"], y=cfg[pre+"Y"];
    const direction=cfg[pre+"Direction"];
    const distance=section==="tab"?36:24;
    if(x===0&&y===0){if(direction==="left")x=-distance;else if(direction==="right")x=distance;else if(direction==="up")y=-distance;else if(direction==="down")y=distance;}
    const rot=section==="tab"?cfg.tabRotation:0;
    const perspective=section==="tab"?cfg.tabPerspective:1000;
    const hidden={transform:`perspective(${perspective}px) translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${rot}deg)`,filter:`blur(${blur}px)`,opacity};
    hidden._scale=scale;hidden._x=x;hidden._y=y;hidden._rotation=rot;hidden._perspective=perspective;
    const shown={transform:"perspective(1000px) translate3d(0,0,0) scale(1) rotate(0deg)",filter:"blur(0px)",opacity:1,_scale:1,_x:0,_y:0,_rotation:0,_perspective:1000};
    return incoming ? makeFrames(hidden,shown,section,cfg) : makeFrames(shown,hidden,section,cfg);
  }
  function animate(element, section, incoming, cfg, duration) {
    if(!element?.isConnected)return null;
    cancel(element);
    const frames=framesFor(section,incoming,cfg);
    const curve=cfg[section==="tab"?"tabCurve":"loadingCurve"];
    const special=/^(Elastic|Bounce|Back)/.test(curve);
    const options={duration,easing:special?"linear":(curve==="Custom"?`cubic-bezier(${cfg[section+"CurveX1"]},${cfg[section+"CurveY1"]},${cfg[section+"CurveX2"]},${cfg[section+"CurveY2"]})`:curve==="Linear"?"linear":`cubic-bezier(${(CURVES[curve]||CURVES.Smooth).join(",")})`),fill:"both"};
    if(section==="tab"&&incoming&&cfg.tabOvershoot&&frames.length>=2){
      const middle={offset:.88,transform:"perspective(1000px) translate3d(0,0,0) scale(1.012) rotate(0deg)",filter:"blur(0px)",opacity:1};
      frames.splice(frames.length-1,0,middle);
      if(frames.length===3){frames[0].offset=0;frames[1].offset=.88;frames[2].offset=1;}
    }
    const a=element.animate(frames,options); active.set(element,a);
    a.finished.then(()=>{if(active.get(element)===a){active.delete(element);a.cancel();}}).catch(()=>{});
    return a;
  }

  function waitForLoad(browser, timeout) {
    return new Promise(resolve=>{
      if(!browser){resolve("missing");return;}
      try { if(browser.contentDocument?.readyState==="complete"&&!browser.webProgress?.isLoadingDocument){resolve("loaded");return;} } catch {}
      let done=false;
      const finish=r=>{if(done)return;done=true;browser.removeEventListener("load",onLoad,true);clearTimeout(timer);resolve(r);};
      const onLoad=e=>{try{if(e.target===browser.contentDocument&&browser.contentDocument.readyState==="complete")finish("loaded");}catch{}};
      const timer=setTimeout(()=>finish("timeout"),timeout);
      browser.addEventListener("load",onLoad,true);
    });
  }

  let pending=[];
  async function onTabSelect(event) {
    const oldTab=event.detail?.previousTab, newTab=gBrowser.selectedTab;
    if(!oldTab||!newTab||oldTab===newTab)return;
    const cfg=settings();
    if((!cfg.enabled&&!cfg.loadingEnabled) || (cfg.respectReducedMotion&&matchMedia("(prefers-reduced-motion: reduce)").matches))return;
    const oldGroup=splitGroup(oldTab), newGroup=splitGroup(newTab);
    if(oldGroup&&oldGroup===newGroup)return;
    for(const p of pending) p.cancelled=true;
    pending=[];
    const oldUnit=visualUnit(oldTab), newUnit=visualUnit(newTab);
    if(cfg.enabled){
      const runOutgoing=()=>{for(const tab of oldUnit){const el=getContainer(tab);if(el)animate(el,"tab",false,cfg,cfg.tabExitDuration);}};
      if(cfg.tabExitDelay>0)setTimeout(runOutgoing,cfg.tabExitDelay);else runOutgoing();
    }
    const token={cancelled:false}; pending.push(token);
    const incoming=[];
    for(const tab of newUnit){
      const container=getContainer(tab), browser=tab?.linkedBrowser;
      // Tab transition runs on the browser container. Loading transition runs
      // on the inner <browser>, keeping Zen's native toolbar progress indicator untouched.
      let tabAnimation=null;
      if(container&&cfg.enabled){
        tabAnimation=animate(container,"tab",true,cfg,Math.max(1,cfg.tabEnterDuration));
        if(tabAnimation){tabAnimation.pause();tabAnimation.currentTime=0;}
      }
      if(container||browser)incoming.push({container,browser,tabAnimation});
    }
    const enterDelay=cfg.enabled?Math.max(0,cfg.tabEnterDelay+cfg.tabDelay):0;
    if(enterDelay) await new Promise(r=>setTimeout(r,enterDelay));
    if(token.cancelled)return;
    for(const item of incoming) if(item.container?.isConnected&&item.tabAnimation) item.tabAnimation.play();

    if(cfg.loadingEnabled && incoming.length){
      const loadingItems=[];
      for(const item of incoming){
        if(!item.browser) continue;
        const loadingAnimation=animate(item.browser,"loading",true,cfg,Math.max(1,cfg.loadingDuration));
        if(loadingAnimation){loadingAnimation.pause();loadingAnimation.currentTime=0;loadingItems.push({browser:item.browser,loadingAnimation});}
      }
      if(cfg.loadingStartDelay) await new Promise(r=>setTimeout(r,cfg.loadingStartDelay));
      const timeout=Math.max(1000,Math.min(cfg.loadingTimeout,cfg.loadingMaximumDuration));
      const started=Date.now();
      if(cfg.splitLoadingMode==="independent"){
        await Promise.all(loadingItems.map(async item=>{
          await waitForLoad(item.browser,timeout);
          const remaining=Math.max(0,cfg.loadingMinimumDuration-(Date.now()-started));
          if(remaining) await new Promise(r=>setTimeout(r,remaining));
          if(!token.cancelled){if(cfg.loadingCompletionDelay)await new Promise(r=>setTimeout(r,cfg.loadingCompletionDelay));item.loadingAnimation.play();}
        }));
      } else {
        await Promise.all(loadingItems.map(item=>waitForLoad(item.browser,timeout)));
        const remaining=Math.max(0,cfg.loadingMinimumDuration-(Date.now()-started));
        if(remaining) await new Promise(r=>setTimeout(r,remaining));
        if(!token.cancelled){if(cfg.loadingCompletionDelay)await new Promise(r=>setTimeout(r,cfg.loadingCompletionDelay));for(const item of loadingItems)item.loadingAnimation.play();}
      }
    }
  }

  // ---------- UI ----------
  const css = `
  #stt-launch{list-style-image:none!important;min-width:30px!important;width:30px;height:30px;margin:2px 4px!important;border:0!important;border-radius:9px!important;background:var(--toolbarbutton-hover-background)!important;color:var(--toolbar-color)!important;font-size:17px!important}
  #stt-launch::before{content:"◌";font-size:21px}
  #stt-panel{position:fixed;z-index:2147483000;inset:5vh 5vw auto auto;width:min(920px,90vw);height:min(88vh,900px);display:none;overflow:hidden;border:1px solid color-mix(in srgb,var(--zen-colors-border, currentColor) 55%,transparent);border-radius:16px;background:var(--zen-colors-tertiary, var(--toolbar-bgcolor));color:var(--toolbar-color);box-shadow:0 24px 80px #0009;font:13px system-ui}
  #stt-panel.open{display:flex;flex-direction:column}
  #stt-panel *{box-sizing:border-box}
  #stt-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #8884}
  #stt-head h2{margin:0;font-size:18px} #stt-head small{opacity:.65}
  #stt-close{border:0;border-radius:8px;padding:7px 11px;background:#8882;color:inherit;cursor:pointer}
  #stt-tabs{display:flex;gap:6px;padding:10px 18px;border-bottom:1px solid #8884}
  #stt-tabs button,.stt-btn{border:1px solid #8885;border-radius:8px;padding:8px 12px;background:#8881;color:inherit;cursor:pointer}
  #stt-tabs button.active{background:var(--zen-primary-color, #477ee8);color:white;border-color:transparent}
  #stt-content{overflow:auto;padding:16px 20px 24px}
  .stt-section{display:none}.stt-section.active{display:block}
  .stt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .stt-card{border:1px solid #8884;border-radius:12px;padding:14px;margin-bottom:14px;background:#88808}
  .stt-card h3{margin:0 0 12px;font-size:14px}
  .stt-field{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;min-width:0}
  .stt-field label{font-size:12px;opacity:.82}
  .stt-field input,.stt-field select{width:100%;min-height:32px;border:1px solid #8886;border-radius:7px;padding:5px 8px;background:var(--input-bgcolor, #8882);color:inherit}
  .stt-field input[type=checkbox]{width:auto;min-height:auto;align-self:flex-start}
  .stt-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .stt-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
  .stt-note{opacity:.65;font-size:11px;line-height:1.45}
  .stt-graph{width:100%;height:250px;display:block;border:1px solid #8885;border-radius:10px;background:#1111;touch-action:none}
  .stt-graph .grid{stroke:currentColor;opacity:.16;stroke-dasharray:3 4}
  .stt-graph .axis{stroke:currentColor;opacity:.65}
  .stt-graph .curve{fill:none;stroke:var(--zen-primary-color,#5792ff);stroke-width:3}
  .stt-graph .handle{fill:var(--zen-primary-color,#5792ff);stroke:white;stroke-width:2;cursor:grab}
  .stt-slider{display:grid;grid-template-columns:1fr 72px;gap:8px;align-items:center}
  .stt-slider input[type=range]{width:100%}
  @media(max-width:650px){#stt-panel{inset:2vh 2vw;width:96vw;height:96vh}.stt-grid,.stt-row{grid-template-columns:1fr}}
  `;
  function el(tag, attrs={}, children=[]) {
    const node=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){if(k==="class")node.className=v;else if(k==="text")node.textContent=v;else if(k==="html")node.innerHTML=v;else node.setAttribute(k,v);}
    for(const c of children)node.append(c);
    return node;
  }
  function ensureUI() {
    if(document.getElementById("stt-panel"))return;
    const style=el("style",{id:"stt-style",text:css}); document.documentElement.append(style);
    const toolbar=document.getElementById("nav-bar")||document.getElementById("TabsToolbar")||document.getElementById("titlebar");
    const button=document.createXULElement("toolbarbutton");
    button.id="stt-launch";button.setAttribute("class","toolbarbutton-1 chromeclass-toolbar-additional");button.setAttribute("tooltiptext","Smooth Tab Transition settings");button.addEventListener("command",togglePanel);
    if(toolbar)toolbar.append(button);
    const panel=el("div",{id:"stt-panel"});
    panel.innerHTML=`
      <header id="stt-head"><div><h2>Smooth Tab Transition</h2><small>Version ${VERSION} · Live settings</small></div><button id="stt-close">Close ✕</button></header>
      <nav id="stt-tabs"><button data-page="tab" class="active">Tab Transition</button><button data-page="loading">Loading Transition</button><button data-page="general">General</button></nav>
      <main id="stt-content">
        <section class="stt-section active" data-section="tab">
          <div class="stt-card"><h3>Preset and main behavior</h3><div class="stt-grid">
            <div class="stt-field"><label>Animation preset</label><select data-key="tabPreset" id="stt-tab-preset"></select></div>
            <div class="stt-field"><label>Direction</label><select data-key="tabDirection"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option><option value="down">Down</option></select></div>
            <div class="stt-field"><label>Duration (ms)</label><input data-key="tabDuration" type="number" min="50" max="2000"></div>
            <div class="stt-field"><label>Exit duration (ms)</label><input data-key="tabExitDuration" type="number" min="50" max="2000"></div>
            <div class="stt-field"><label>Enter duration (ms)</label><input data-key="tabEnterDuration" type="number" min="50" max="2000"></div>
            <div class="stt-field"><label>Scale (0.80–1)</label><input data-key="tabScale" type="number" min=".8" max="1" step=".001"></div>
            <div class="stt-field"><label>Blur (px)</label><input data-key="tabBlur" type="number" min="0" max="40" step=".5"></div>
            <div class="stt-field"><label>Opacity (0–1)</label><input data-key="tabOpacity" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Translation X (px)</label><input data-key="tabX" type="number" min="-300" max="300"></div>
            <div class="stt-field"><label>Translation Y (px)</label><input data-key="tabY" type="number" min="-300" max="300"></div>
            <div class="stt-field"><label>Rotation (deg)</label><input data-key="tabRotation" type="number" min="-20" max="20" step=".1"></div>
            <div class="stt-field"><label>Perspective (px)</label><input data-key="tabPerspective" type="number" min="200" max="3000"></div>
            <div class="stt-field"><label>Global delay (ms)</label><input data-key="tabDelay" type="number" min="0" max="1500"></div>
            <div class="stt-field"><label>Exit delay (ms)</label><input data-key="tabExitDelay" type="number" min="0" max="1500"></div>
            <div class="stt-field"><label>Enter delay (ms)</label><input data-key="tabEnterDelay" type="number" min="0" max="1500"></div>
            <div class="stt-field"><label><input type="checkbox" data-key="tabOvershoot"> Enable subtle overshoot</label></div>
          </div><div class="stt-actions"><button class="stt-btn" data-reset="tab">Reset Tab Transition defaults</button></div></div>
          <div class="stt-card"><h3>Animation curve editor</h3><div class="stt-field"><label>Curve preset</label><select data-key="tabCurve" id="stt-tab-curve"></select></div><svg class="stt-graph" id="stt-tab-graph" viewBox="0 0 600 250" aria-label="Tab transition curve editor"></svg><div class="stt-row">
            <div class="stt-field"><label>Control point 1 X</label><input data-key="tabCurveX1" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Control point 1 Y</label><input data-key="tabCurveY1" type="number" min="-1" max="2" step=".01"></div>
            <div class="stt-field"><label>Control point 2 X</label><input data-key="tabCurveX2" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Control point 2 Y</label><input data-key="tabCurveY2" type="number" min="-1" max="2" step=".01"></div>
          </div><p class="stt-note">Trascina i due punti blu per modificare la curva. La griglia mostra i riferimenti 0, 0.25, 0.5, 0.75 e 1. Le curve Elastic e Bounce sono funzioni dedicate e vengono visualizzate come campionamento.</p><div class="stt-actions"><button class="stt-btn" data-reset-curve="tab">Reset curve</button></div></div>
        </section>
        <section class="stt-section" data-section="loading">
          <div class="stt-card"><h3>Loading behavior</h3><div class="stt-grid">
            <div class="stt-field"><label>Animation preset</label><select data-key="loadingPreset" id="stt-loading-preset"></select></div>
            <div class="stt-field"><label>Direction</label><select data-key="loadingDirection"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option><option value="up">Up</option><option value="down">Down</option></select></div>
            <div class="stt-field"><label>Duration (ms)</label><input data-key="loadingDuration" type="number" min="50" max="2000"></div>
            <div class="stt-field"><label>Minimum duration (ms)</label><input data-key="loadingMinimumDuration" type="number" min="0" max="5000"></div>
            <div class="stt-field"><label>Maximum duration (ms)</label><input data-key="loadingMaximumDuration" type="number" min="1000" max="60000"></div>
            <div class="stt-field"><label>Start delay (ms)</label><input data-key="loadingStartDelay" type="number" min="0" max="3000"></div>
            <div class="stt-field"><label>Completion delay (ms)</label><input data-key="loadingCompletionDelay" type="number" min="0" max="3000"></div>
            <div class="stt-field"><label>Timeout fallback (ms)</label><input data-key="loadingTimeout" type="number" min="1000" max="60000"></div>
            <div class="stt-field"><label>Scale (0.80–1)</label><input data-key="loadingScale" type="number" min=".8" max="1" step=".001"></div>
            <div class="stt-field"><label>Blur (px)</label><input data-key="loadingBlur" type="number" min="0" max="40" step=".5"></div>
            <div class="stt-field"><label>Opacity (0–1)</label><input data-key="loadingOpacity" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Translation X (px)</label><input data-key="loadingX" type="number" min="-300" max="300"></div>
            <div class="stt-field"><label>Translation Y (px)</label><input data-key="loadingY" type="number" min="-300" max="300"></div>
            <div class="stt-field"><label>Split View loading</label><select data-key="splitLoadingMode"><option value="all">Wait for both panes</option><option value="independent">Complete independently</option></select></div>
          </div><div class="stt-actions"><button class="stt-btn" data-reset="loading">Reset Loading Transition defaults</button></div><p class="stt-note">La barra di caricamento nativa di Zen non viene selezionata né animata: gli effetti si applicano solo al contenitore del contenuto della scheda.</p></div>
          <div class="stt-card"><h3>Loading curve editor</h3><div class="stt-field"><label>Curve preset</label><select data-key="loadingCurve" id="stt-loading-curve"></select></div><svg class="stt-graph" id="stt-loading-graph" viewBox="0 0 600 250" aria-label="Loading transition curve editor"></svg><div class="stt-row">
            <div class="stt-field"><label>Control point 1 X</label><input data-key="loadingCurveX1" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Control point 1 Y</label><input data-key="loadingCurveY1" type="number" min="-1" max="2" step=".01"></div>
            <div class="stt-field"><label>Control point 2 X</label><input data-key="loadingCurveX2" type="number" min="0" max="1" step=".01"></div>
            <div class="stt-field"><label>Control point 2 Y</label><input data-key="loadingCurveY2" type="number" min="-1" max="2" step=".01"></div>
          </div><p class="stt-note">I punti di controllo possono essere spostati direttamente sul grafico oppure modificati con i campi numerici.</p><div class="stt-actions"><button class="stt-btn" data-reset-curve="loading">Reset curve</button></div></div>
        </section>
        <section class="stt-section" data-section="general">
          <div class="stt-card"><h3>General</h3>
            <div class="stt-field"><label><input type="checkbox" data-key="enabled"> Enable tab transitions</label></div>
            <div class="stt-field"><label><input type="checkbox" data-key="loadingEnabled"> Enable loading transition</label></div>
            <div class="stt-field"><label><input type="checkbox" data-key="animateSplit"> Animate Split View as one unit</label></div>
            <div class="stt-field"><label><input type="checkbox" data-key="respectReducedMotion"> Respect reduced motion preference</label></div>
            <div class="stt-actions"><button class="stt-btn" data-reset="all">Restore all defaults</button></div>
            <p class="stt-note">Le impostazioni vengono salvate immediatamente nelle preferenze del browser e applicate alle transizioni successive.</p>
          </div>
        </section>
      </main>`;
    document.documentElement.append(panel);
    panel.querySelector("#stt-close").addEventListener("click",togglePanel);
    panel.querySelectorAll("#stt-tabs button").forEach(b=>b.addEventListener("click",()=>{
      panel.querySelectorAll("#stt-tabs button").forEach(x=>x.classList.toggle("active",x===b));
      panel.querySelectorAll(".stt-section").forEach(x=>x.classList.toggle("active",x.dataset.section===b.dataset.page));
    }));
    for(const [id,section] of [["stt-tab-preset","tab"],["stt-loading-preset","loading"]]){
      const select=panel.querySelector("#"+id);
      Object.keys(PRESETS[section]).forEach(name=>select.append(el("option",{value:name,text:name})));
    }
    for(const id of ["stt-tab-curve","stt-loading-curve"]){
      const select=panel.querySelector("#"+id);
      Object.keys(CURVES).forEach(name=>select.append(el("option",{value:name,text:name})));
    }
    panel.querySelectorAll("[data-key]").forEach(input=>{
      const key=input.dataset.key;
      const val=read(key);
      if(input.type==="checkbox")input.checked=val;else input.value=val;
      input.addEventListener("change",()=>{
        let value=input.type==="checkbox"?input.checked:input.type==="number"?Number(input.value):input.value;
        if(input.type==="number"&&!Number.isFinite(value))return;
        if(key==="tabPreset"){applyPreset("tab",value);syncUI();return;}
        if(key==="loadingPreset"){applyPreset("loading",value);syncUI();return;}
        write(key,value);
        if(key==="tabDuration"){
          write("tabExitDuration",value);write("tabEnterDuration",value);
        }
        if(key.startsWith("tab")&&!["tabPreset"].includes(key))write("tabPreset",detectPreset("tab"));
        if(key.startsWith("loading")&&!["loadingPreset"].includes(key))write("loadingPreset",detectPreset("loading"));
        if(key.endsWith("Curve") && value!=="Custom"){
          const c=CURVES[value];
          if(Array.isArray(c)){
            const pre=key.startsWith("tab")?"tabCurve":"loadingCurve";
            ["X1","Y1","X2","Y2"].forEach((p,i)=>{write(pre+p,c[i]);const field=panel.querySelector(`[data-key="${pre+p}"]`);if(field)field.value=c[i];});
          }
        }
        syncUI();
      });
    });
    panel.querySelectorAll("[data-reset]").forEach(b=>b.addEventListener("click",()=>{
      const scope=b.dataset.reset;
      const keys=Object.keys(DEFAULTS).filter(k=>scope==="all"||(scope==="tab"&&k.startsWith("tab"))||(scope==="loading"&&k.startsWith("loading")));
      for(const k of keys)write(k,DEFAULTS[k]);
      syncUI();
    }));
    panel.querySelectorAll("[data-reset-curve]").forEach(b=>b.addEventListener("click",()=>{
      const pre=b.dataset.resetCurve==="tab"?"tabCurve":"loadingCurve";
      ["X1","Y1","X2","Y2"].forEach((p,i)=>write(pre+p,[.22,1,.36,1][i]));
      write(pre==="tabCurve"?"tabCurve":"loadingCurve","Smooth");
      syncUI();
    }));
    makeGraph("tab");makeGraph("loading");syncUI();
  }

  function syncUI(){
    const panel=document.getElementById("stt-panel");if(!panel)return;
    const s=settings();
    panel.querySelectorAll("[data-key]").forEach(input=>{
      const key=input.dataset.key;
      if(document.activeElement===input)return;
      if(input.type==="checkbox")input.checked=!!s[key];else input.value=s[key];
    });
    panel.querySelector("#stt-tab-preset").value=detectPreset("tab");
    panel.querySelector("#stt-loading-preset").value=detectPreset("loading");
    drawGraph("tab");drawGraph("loading");
  }

  function makeGraph(section){
    const svg=document.getElementById(`stt-${section}-graph`);if(!svg)return;
    let dragging=-1;
    const pointFromEvent=e=>{
      const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*600,y=(e.clientY-r.top)/r.height*250;
      return [clamp((x-40)/520,0,1),clamp(1-(y-18)/210,-.15,1.15)];
    };
    svg.addEventListener("pointerdown",e=>{
      const [x,y]=pointFromEvent(e),s=settings(),p=section+"Curve";
      const d1=Math.hypot((x-s[p+"X1"])*520,(y-s[p+"Y1"])*210),d2=Math.hypot((x-s[p+"X2"])*520,(y-s[p+"Y2"])*210);
      dragging=d1<d2?1:2;svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove",e=>{
      if(!dragging)return;
      const [x,y]=pointFromEvent(e),p=section+"Curve";
      write(p+(dragging===1?"X1":"X2"),x);write(p+(dragging===1?"Y1":"Y2"),y);
      write(p,"Custom");write(section+"Preset","Custom");syncUI();
    });
    const stop=()=>dragging=-1;
    svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
  }
  function drawGraph(section){
    const svg=document.getElementById(`stt-${section}-graph`);if(!svg)return;
    const s=settings(),p=section+"Curve",curve=s[p],x1=s[p+"X1"],y1=s[p+"Y1"],x2=s[p+"X2"],y2=s[p+"Y2"];
    const X=x=>40+x*520,Y=y=>228-y*210;
    let grid="";
    for(let i=0;i<=4;i++){const x=40+i*130,y=18+i*52.5;grid+=`<line class="grid" x1="${x}" y1="18" x2="${x}" y2="228"/><line class="grid" x1="40" y1="${y}" x2="560" y2="${y}"/><text x="${x}" y="244" fill="currentColor" opacity=".65" font-size="10" text-anchor="middle">${(i/4).toFixed(2)}</text>`;}
    const curvePath=Array.isArray(CURVES[curve])||curve==="Custom" ? `M40 228 C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, 560 18` : (()=>{let d="";for(let i=0;i<=60;i++){const t=i/60,v=curveValue(curve,t,section);d+=(i?" L":"M")+X(t)+" "+Y(v);}return d;})();
    svg.innerHTML=`${grid}<line class="axis" x1="40" y1="228" x2="560" y2="228"/><line class="axis" x1="40" y1="18" x2="40" y2="228"/><line x1="40" y1="228" x2="${X(x1)}" y2="${Y(y1)}" stroke="#e39b46" stroke-dasharray="4 4"/><line x1="560" y1="18" x2="${X(x2)}" y2="${Y(y2)}" stroke="#e39b46" stroke-dasharray="4 4"/><path class="curve" d="${curvePath}"/><circle class="handle" cx="${X(x1)}" cy="${Y(y1)}" r="7"/><circle class="handle" cx="${X(x2)}" cy="${Y(y2)}" r="7"/>`;
  }

  function togglePanel(){
    ensureUI();
    const panel=document.getElementById("stt-panel");
    panel.classList.toggle("open");
    if(panel.classList.contains("open"))syncUI();
  }

  function init(){
    ensureUI();
    window.addEventListener("TabSelect",onTabSelect,true);
    window.addEventListener("unload",()=>{for(const p of pending)p.cancelled=true;},{once:true});
    console.log(`[Smooth Tab Transition] v${VERSION} loaded; settings panel ready.`);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();