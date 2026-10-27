/* One script for every page. Each part only runs when its elements exist:
   home  -> oscilloscope + door previews
   video -> reel monitor + cue list
   music -> tracklist, Rough/Mix A/B, level meter
   Videos and tracks come from the database (edit them at /admin) and are
   passed in by the templates with Django's json_script filter. */
const readData = id => { const el = document.getElementById(id); return el ? JSON.parse(el.textContent) : []; };
const VIDEOS = readData("videos-data");
const TRACKS = readData("tracks-data");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PLAY = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function fitCanvas(c) {
  const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return [w, h];
}

/* ---------- hero oscilloscope ---------- */
const scope = document.getElementById("scope");
let audioAnalyser = null;
function drawScope(t) {
  const [w, h] = fitCanvas(scope), g = scope.getContext("2d");
  g.clearRect(0, 0, w, h);
  g.lineWidth = 2 * Math.min(devicePixelRatio || 1, 2);
  let data = null;
  if (audioAnalyser) { data = new Float32Array(audioAnalyser.fftSize); audioAnalyser.getFloatTimeDomainData(data); }
  [[css("--spell"), 0], [css("--bone"), 1]].forEach(([col, k]) => {
    g.strokeStyle = col; g.globalAlpha = k ? .35 : 1; g.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const p = x / w;
      let y;
      if (data) y = data[Math.floor(p * (data.length - 1))] * (k ? .6 : 1) * h * .9;
      else y = Math.sin(p * 18 + t * 2.1 + k) * Math.sin(p * 3.1 - t * .7) * h * .28 + Math.sin(p * 61 + t * 5) * h * .05 * (1 - k);
      x ? g.lineTo(x, h / 2 + y) : g.moveTo(x, h / 2 + y);
    }
    g.stroke();
  });
  g.globalAlpha = 1;
}

/* ---------- video monitor ---------- */
function drawScene(g, w, h, t, clip) {
  const R = rng(clip.hue * 97 + 3), hue = clip.hue;
  g.fillStyle = `hsl(${hue} 45% 7%)`; g.fillRect(0, 0, w, h);
  if (clip.look === "tape") {
    for (let i = 0; i < 9; i++) {
      const y = ((R() * h + t * (40 + i * 25)) % (h * 1.2)) - h * .1, bh = h * (.03 + R() * .12);
      g.fillStyle = `hsla(${(hue + i * 18) % 360} 90% ${45 + R() * 25}% / ${.25 + R() * .5})`;
      g.fillRect(0, y, w, bh);
    }
  } else if (clip.look === "strobe") {
    const beat = (t * 140 / 60) % 1, pulse = 1 + (1 - beat) ** 3 * .25;
    g.save(); g.translate(w / 2, h / 2);
    for (let i = 9; i > 0; i--) {
      g.rotate(t * .35 * (i % 2 ? 1 : -1) * .3);
      const r = i * h * .07 * pulse, n = 3 + (i % 4);
      g.beginPath();
      for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.strokeStyle = i % 2 ? `hsl(${hue} 90% 60%)` : `hsl(${(hue + 280) % 360} 95% 65%)`;
      g.lineWidth = h * .012; g.stroke();
    }
    g.restore();
    if (beat < .08) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 0, w, h); }
  } else {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, `hsl(${hue} 60% 12%)`); grd.addColorStop(1, `hsl(${(hue + 40) % 360} 70% 30%)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const flick = .85 + Math.sin(t * 23) * .05 + Math.sin(t * 3.7) * .1;
    g.fillStyle = `hsla(50 90% 85% / ${flick})`;
    g.beginPath(); g.arc(w * .68, h * .36, h * .2, 0, Math.PI * 2); g.fill();
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = `hsl(${hue} 40% ${4 + layer * 3}%)`; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 40) {
        const y = h * (.62 + layer * .1) + Math.sin(x / w * (5 + layer * 3) + t * (.2 + layer * .3) + layer) * h * .06;
        g.lineTo(x, y);
      }
      g.lineTo(w, h); g.fill();
    }
    // road lines
    g.strokeStyle = "rgba(255,230,120,.8)"; g.lineWidth = h * .01;
    for (let i = 0; i < 6; i++) {
      const p = ((i / 6 + t * .4) % 1); const y = h * .82 + p * p * h * .2;
      g.beginPath(); g.moveTo(w / 2 - p * w * .02, y); g.lineTo(w / 2 + p * w * .02, y + p * h * .04); g.stroke();
    }
  }
  // grain + scanlines + vignette
  for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() > .5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.18)"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  const v = g.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, w * .7);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.65)"); g.fillStyle = v; g.fillRect(0, 0, w, h);
}

const monitor = document.getElementById("monitor"), screen = document.getElementById("screen");
const cuesEl = document.getElementById("cues"), vToggle = document.getElementById("v-toggle");
let current = 0, vPlaying = !reduceMotion, vTime = 0, videoEl = null, ytEl = null;

if (cuesEl) VIDEOS.forEach((v, i) => {
  const li = document.createElement("li"); li.className = "cue";
  const thumb = v.youtube ? `<img src="https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg" alt="" loading="lazy">` : `<canvas data-i="${i}"></canvas>`;
  li.innerHTML = `<button type="button">${thumb}<span><div class="t"></div><div class="a"></div><div class="r"></div></span></button>`;
  li.querySelector(".t").textContent = v.title;
  li.querySelector(".a").textContent = v.artist;
  li.querySelector(".r").textContent = `${v.role} · ${v.runtime}`;
  li.querySelector("button").addEventListener("click", () => loadVideo(i, true));
  cuesEl.appendChild(li);
});
function drawThumbs() {
  if (!cuesEl) return;
  cuesEl.querySelectorAll("canvas").forEach(c => { const i = +c.dataset.i, [w, h] = fitCanvas(c); drawScene(c.getContext("2d"), w, h, 2.4 + i, VIDEOS[i]); });
}
function loadVideo(i, play) {
  current = i; vTime = 0;
  const v = VIDEOS[i];
  cuesEl.querySelectorAll(".cue").forEach((el, k) => el.classList.toggle("on", k === i));
  document.getElementById("v-title").textContent = v.title;
  document.getElementById("v-meta").textContent = `${v.artist} · ${v.role} · ${v.year} · ${v.runtime}`;
  const link = document.getElementById("v-link");
  link.hidden = !v.link; if (v.link) link.href = v.link;
  if (videoEl) { videoEl.remove(); videoEl = null; }
  if (ytEl) { ytEl.remove(); ytEl = null; }
  screen.classList.toggle("yt", !!v.youtube);
  if (v.youtube) {
    ytEl = document.createElement("iframe");
    ytEl.src = `https://www.youtube-nocookie.com/embed/${v.youtube}?rel=0&modestbranding=1${play ? "&autoplay=1" : ""}`;
    ytEl.title = `${v.artist} – ${v.title}`;
    ytEl.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    ytEl.allowFullscreen = true;
    ytEl.referrerPolicy = "strict-origin-when-cross-origin";  // YouTube refuses to play (error 153) without it
    screen.appendChild(ytEl);
  } else if (v.src) {
    videoEl = document.createElement("video");
    Object.assign(videoEl, { src: v.src, muted: true, loop: true, playsInline: true, controls: true });
    screen.appendChild(videoEl);
  }
  if (play) setVideoPlaying(true); else setVideoPlaying(vPlaying);
}
function setVideoPlaying(p) {
  vPlaying = p;
  if (vToggle) vToggle.hidden = !!ytEl;  // YouTube has its own controls
  screen.classList.toggle("paused", !p);
  vToggle.innerHTML = p ? PAUSE : PLAY;
  vToggle.setAttribute("aria-label", p ? "Pause preview" : "Play preview");
  if (videoEl) p ? videoEl.play().catch(() => {}) : videoEl.pause();
}
if (vToggle) vToggle.addEventListener("click", () => setVideoPlaying(!vPlaying));
function timecode(s) {
  const f = Math.floor(s * 24) % 24, ss = Math.floor(s) % 60, m = Math.floor(s / 60) % 60, hh = Math.floor(s / 3600);
  return [hh, m, ss, f].map(n => String(n).padStart(2, "0")).join(":");
}

/* ---------- audio engine ---------- */
let ctx, master, analyser, roughOut, mixOut, mixIn, revSend, noiseBuf;
let abMode = "mix", playing = -1, step = 0, nextTime = 0, timer = null, mediaPair = null;

function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = .8;
  analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
  master.connect(analyser); analyser.connect(ctx.destination);
  roughOut = ctx.createGain(); mixOut = ctx.createGain();
  roughOut.connect(master); mixOut.connect(master);
  // mix bus: glue comp -> makeup -> limiter
  mixIn = ctx.createGain();
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20; glue.ratio.value = 4; glue.attack.value = .01; glue.release.value = .15;
  const makeup = ctx.createGain(); makeup.gain.value = 1.9;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -4; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .08;
  mixIn.connect(glue); glue.connect(makeup); makeup.connect(lim); lim.connect(mixOut);
  // reverb
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  revSend = ctx.createGain(); revSend.gain.value = .5;
  revSend.connect(verb); verb.connect(mixIn);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  audioAnalyser = analyser;
  setAB(abMode, true);
}
function setAB(mode, instant) {
  abMode = mode;
  document.querySelectorAll(".ab button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ab === mode)));
  if (!ctx) return;
  const t = ctx.currentTime, k = instant ? .001 : .04;
  roughOut.gain.setTargetAtTime(mode === "rough" ? 1 : 0, t, k);
  mixOut.gain.setTargetAtTime(mode === "mix" ? 1 : 0, t, k);
}
document.querySelectorAll(".ab button").forEach(b => b.addEventListener("click", () => setAB(b.dataset.ab)));

// route a voice to both the rough path and the processed mix path
function route(node, o) {
  const rg = ctx.createGain(); rg.gain.value = o.rough; node.connect(rg); rg.connect(roughOut);
  let n = node;
  if (o.hp) { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = o.hp; n.connect(f); n = f; }
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (p.pan) p.pan.value = o.pan || 0;
  const mg = ctx.createGain(); mg.gain.value = o.mix;
  n.connect(p); p.connect(mg); mg.connect(mixIn);
  if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev; mg.connect(s); s.connect(revSend); }
}
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
  env(g, t, .002, .9, .32); o.connect(g); o.start(t); o.stop(t + .4);
  route(g, { rough: .45, mix: 1.1 });
}
function snare(t) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = .7;
  const g = ctx.createGain(); env(g, t, .001, .7, .18);
  n.connect(bp); bp.connect(g); n.start(t); n.stop(t + .25);
  const o = ctx.createOscillator(), og = ctx.createGain(); o.type = "triangle"; o.frequency.value = 190;
  env(og, t, .001, .5, .08); o.connect(og); og.connect(g); o.start(t); o.stop(t + .12);
  route(g, { rough: 1.3, mix: .75, rev: .45, hp: 120 });
}
function hat(t, open, side) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500;
  const g = ctx.createGain(); env(g, t, .001, .35, open ? .22 : .035);
  n.connect(hp); hp.connect(g); n.start(t); n.stop(t + .3);
  route(g, { rough: 1.1, mix: .38, pan: side * .55 });
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function bass(t, midi, dur) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = "sawtooth"; o.frequency.value = mtof(midi);
  f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
  env(g, t, .005, .55, dur); o.connect(f); f.connect(g); o.start(t); o.stop(t + dur + .05);
  route(g, { rough: 1.5, mix: .75, hp: 38 });
}
function chord(t, notes, dur, i) {
  const out = ctx.createGain(); env(out, t, .03, .18, dur);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2200;
  notes.forEach((m, k) => {
    [-6, 6].forEach(det => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + .1);
    });
  });
  f.connect(out);
  route(out, { rough: 1.2, mix: .5, hp: 220, pan: i % 2 ? .35 : -.35, rev: .6 });
}

const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
const PROG = { minor: [0, 5, 2, 6], major: [0, 4, 5, 3] };
const GROOVES = {
  punk: { kick: [0, 6, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [], bass: [0, 2, 4, 6, 8, 10, 12, 14], bassLen: 1.6 },
  half: { kick: [0, 3, 10], snare: [8], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [14], bass: [0, 3, 10], bassLen: 2.5 },
  slow: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [6], bass: [0, 10], bassLen: 6 },
  four: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [2, 6, 10, 14], bass: [2, 6, 10, 14], bassLen: 1.4 },
};
function degreeToMidi(tr, deg) { const s = SCALES[tr.mode]; return tr.root + s[deg % 7] + 12 * Math.floor(deg / 7); }
function scheduleStep(tr, s, t) {
  const gv = GROOVES[tr.groove], beatInBar = s % 16, bar = Math.floor(s / 16) % 4, sd = 60 / tr.bpm / 4;
  const deg = PROG[tr.mode][bar];
  if (gv.kick.includes(beatInBar)) kick(t);
  if (gv.snare.includes(beatInBar)) snare(t);
  if (gv.hat.includes(beatInBar)) hat(t, gv.open.includes(beatInBar), beatInBar % 4 < 2 ? -1 : 1);
  if (gv.bass.includes(beatInBar)) bass(t, degreeToMidi(tr, deg), sd * gv.bassLen);
  if (beatInBar === 0) chord(t, [deg, deg + 2, deg + 4].map(d => degreeToMidi(tr, d) + 12), sd * 15, bar);
}
function scheduler() {
  const tr = TRACKS[playing]; if (!tr) return;
  const sd = 60 / tr.bpm / 4;
  while (nextTime < ctx.currentTime + .12) { scheduleStep(tr, step, nextTime); nextTime += sd; step = (step + 1) % 64; }
}

function stopTrack() {
  clearInterval(timer); timer = null;
  if (mediaPair) { mediaPair.forEach(a => a && a.pause()); mediaPair = null; }
  playing = -1; renderTrackState();
}
function playTrack(i) {
  initAudio(); ctx.resume();
  if (playing === i) { stopTrack(); return; }
  stopTrack();
  playing = i; step = 0; nextTime = ctx.currentTime + .05;
  const tr = TRACKS[i];
  if (tr.mix) {
    // real files: run mix + rough in sync, crossfade with the A/B switch
    const mk = (url, out) => { if (!url) return null; const a = new Audio(url); a.crossOrigin = "anonymous"; a.loop = true; ctx.createMediaElementSource(a).connect(out); return a; };
    const m = mk(tr.mix, mixOut), r = mk(tr.rough, roughOut);
    mediaPair = [m, r]; mediaPair.forEach(a => a && a.play().catch(() => {}));
  } else {
    timer = setInterval(scheduler, 25); scheduler();
  }
  renderTrackState();
}

const tracksEl = document.getElementById("tracks");
const waveData = TRACKS.map((tr, i) => { const R = rng(i * 7919 + tr.bpm); return Array.from({ length: 72 }, (_, k) => { const env = .45 + .55 * Math.sin(Math.PI * Math.min(1, (k + 4) / 76)); return Math.max(.12, env * (.55 + R() * .45)); }); });
if (tracksEl) TRACKS.forEach((tr, i) => {
  const row = document.createElement("div"); row.className = "track"; row.setAttribute("role", "listitem");
  row.innerHTML = `
    <button class="play" type="button"></button>
    <div><div class="t"></div><div class="a"></div><div class="role"></div></div>
    <div class="wave-cell"><canvas class="wave" aria-hidden="true"></canvas></div>
    <div class="num"><small class="label-sm">BPM</small>${tr.bpm}</div>
    <div class="num"><small class="label-sm">Key</small>${tr.key}</div>
    <div class="num"><small class="label-sm">LUFS</small>${tr.lufs}</div>`;
  row.querySelector(".t").textContent = tr.title;
  row.querySelector(".a").textContent = tr.artist;
  row.querySelector(".role").textContent = tr.role;
  row.querySelector(".play").addEventListener("click", () => playTrack(i));
  row.querySelector(".wave").addEventListener("click", e => {
    const r = e.currentTarget.getBoundingClientRect(), p = (e.clientX - r.left) / r.width;
    if (playing !== i) playTrack(i);
    if (mediaPair) mediaPair.forEach(a => a && a.duration && (a.currentTime = p * a.duration));
    else step = Math.floor(p * 64) % 64;
  });
  tracksEl.appendChild(row);
});
function renderTrackState() {
  if (!tracksEl) return;
  tracksEl.querySelectorAll(".track").forEach((row, i) => {
    const on = i === playing, b = row.querySelector(".play");
    row.classList.toggle("on", on); b.innerHTML = on ? PAUSE : PLAY;
    b.setAttribute("aria-label", `${on ? "Stop" : "Play"} ${TRACKS[i].title}`);
  });
  document.getElementById("m-name").textContent = playing < 0 ? "Stopped" : `${TRACKS[playing].title} · ${abMode === "mix" ? "Mix" : "Rough"}`;
}
document.querySelectorAll(".ab button").forEach(b => b.addEventListener("click", renderTrackState));
function trackProgress(i) {
  if (i !== playing) return 0;
  if (mediaPair && mediaPair[0] && mediaPair[0].duration) return mediaPair[0].currentTime / mediaPair[0].duration;
  return step / 64;
}
function drawWaves() {
  if (!tracksEl) return;
  const spell = css("--spell"), dim = "rgba(242,234,228,.28)";
  tracksEl.querySelectorAll(".wave").forEach((c, i) => {
    const [w, h] = fitCanvas(c), g = c.getContext("2d"), d = waveData[i], p = trackProgress(i);
    g.clearRect(0, 0, w, h);
    const bw = w / d.length;
    d.forEach((v, k) => { g.fillStyle = k / d.length < p ? spell : dim; const bh = v * h; g.fillRect(k * bw + bw * .2, (h - bh) / 2, bw * .6, bh); });
  });
}

/* ---------- contact ---------- */
document.getElementById("copy").addEventListener("click", e => {
  const btn = e.currentTarget, text = document.getElementById("email").textContent;
  const done = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy email"), 1600); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => selectEmail(btn));
  else selectEmail(btn);
});
function selectEmail(btn) {
  const r = document.createRange(); r.selectNodeContents(document.getElementById("email"));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected, press Ctrl+C";
}

/* ---------- contact form (sent to Web3Forms, which emails it to you) ---------- */
const form = document.getElementById("contact-form");
if (form) {
  const status = document.getElementById("form-status");
  const sendBtn = form.querySelector(".form-send");
  const say = (text, ok) => { status.textContent = text; status.style.color = ok ? "var(--ink)" : "#3b0018"; };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    // check the required fields ourselves so the messages match the site
    let firstBad = null;
    form.querySelectorAll("[required]").forEach(input => {
      const bad = !input.value.trim() || (input.type === "email" && !input.checkValidity());
      input.closest(".field").classList.toggle("invalid", bad);
      if (bad && !firstBad) firstBad = input;
    });
    if (firstBad) { say("Please fill in your name, a valid email and a message."); firstBad.focus(); return; }

    const key = form.dataset.key;
    const email = document.getElementById("email").textContent;
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return;  // a bot filled the hidden field
    delete data.botcheck;

    if (!key) {
      // No form service key yet: open the visitor's email app with everything filled in
      const body = [
        `Name: ${data.name}`, `Email: ${data.email}`, `Service: ${data.service || "-"}`,
        `Link: ${data.link || "-"}`, `Release date: ${data.release_date || "-"}`, "", data.message,
      ].join("\n");
      location.href = `mailto:${email}?subject=${encodeURIComponent(`Magic Punk inquiry from ${data.name}`)}&body=${encodeURIComponent(body)}`;
      say(`Your email app should open with the message ready. If nothing happened, email me at ${email}.`, true);
      return;
    }
    Object.assign(data, {
      access_key: key,
      subject: `New Magic Punk inquiry${data.service ? `: ${data.service}` : ""} from ${data.name}`,
      from_name: "Magic Punk website",
      replyto: data.email,
    });

    sendBtn.disabled = true; sendBtn.textContent = "Sending…"; say("");
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      form.reset();
      say("Thanks! Your message is on its way. I’ll get back to you within two days.", true);
    } catch (err) {
      say(`Something went wrong sending the form. Please email me at ${email}.`);
    } finally {
      sendBtn.disabled = false; sendBtn.textContent = "Send message";
    }
  });

  // clear the red outline as soon as a field is fixed
  form.addEventListener("input", e => e.target.closest(".field")?.classList.remove("invalid"));

  // "Book …" buttons on the service pages pre-select that service in the form
  document.querySelectorAll(".svc-ask[data-service]").forEach(a => a.addEventListener("click", () => {
    const select = document.getElementById("cf-service");
    if ([...select.options].some(o => o.value === a.dataset.service)) select.value = a.dataset.service;
  }));
}

/* ---------- home: door previews ---------- */
const DEFAULT_CLIP = { artist: "Magic Punk", hue: 330, look: "tape" };
const videoDoor = document.querySelector('[data-door="video"]');
const musicDoor = document.querySelector('[data-door="music"]');
const photoDoor = document.querySelector('[data-door="photo"]');
// aperture blades that close and open like a shutter every couple of seconds
function drawPhotoDoor(t) {
  const [w, h] = fitCanvas(photoDoor), g = photoDoor.getContext("2d");
  g.fillStyle = css("--ink"); g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = h * .42, cycle = t % 2.4;
  const shut = cycle < .25 ? Math.sin(cycle / .25 * Math.PI) : 0;          // 0 open .. 1 closed
  const open = R * (.62 - .5 * shut), blades = 7, spin = t * .15;
  if (cycle < .06) { g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, 0, w, h); }  // flash
  for (let i = 0; i < blades; i++) {
    const a = spin + i / blades * Math.PI * 2, b = a + Math.PI * 2 / blades * 1.35;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.arc(cx, cy, R, a, b);
    g.lineTo(cx + Math.cos(b + .9) * open, cy + Math.sin(b + .9) * open);
    g.lineTo(cx + Math.cos(a + .9) * open, cy + Math.sin(a + .9) * open);
    g.closePath();
    g.fillStyle = i % 2 ? css("--spell") : css("--ink-3"); g.fill();
    g.strokeStyle = css("--ink"); g.lineWidth = 2; g.stroke();
  }
  g.strokeStyle = css("--bone"); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "rgba(0,0,0,.25)"; for (let y = 0; y < h; y += 5) g.fillRect(0, y, w, 1);
}
const doorBars = Array.from({ length: 48 }, (_, i) => rng(i + 11)());
function drawMusicDoor(t) {
  const [w, h] = fitCanvas(musicDoor), g = musicDoor.getContext("2d");
  g.fillStyle = css("--ink"); g.fillRect(0, 0, w, h);
  const n = doorBars.length, bw = w / n, beat = (t * 172 / 60) % 1;
  for (let i = 0; i < n; i++) {
    const lvl = .2 + .55 * Math.abs(Math.sin(t * (1.3 + doorBars[i] * 2.4) + i * .45)) * (1 - i / n * .5) + (1 - beat) ** 4 * .25 * (i < 10);
    const bh = Math.min(.95, lvl) * h;
    g.fillStyle = lvl > .8 ? css("--sulfur") : css("--spell");
    g.fillRect(i * bw + bw * .18, h - bh, bw * .64, bh);
  }
  g.fillStyle = "rgba(0,0,0,.25)"; for (let y = 0; y < h; y += 5) g.fillRect(0, y, w, 1);
}

/* ---------- loop ---------- */
if (VIDEOS.length && screen) loadVideo(0, false);
const tcEl = document.getElementById("tc"), mFill = document.getElementById("m-fill"), mDb = document.getElementById("m-db");
let last = performance.now(), t0 = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!reduceMotion || audioAnalyser) t0 += dt;
  if (scope) drawScope(t0);
  if (videoDoor) { const [w, h] = fitCanvas(videoDoor); drawScene(videoDoor.getContext("2d"), w, h, t0 + 1.5, VIDEOS[0] || DEFAULT_CLIP); }
  if (musicDoor) drawMusicDoor(t0);
  if (photoDoor) drawPhotoDoor(t0);
  if (vPlaying && !videoEl) vTime += dt;
  if (monitor && !videoEl && !ytEl && VIDEOS.length) { const [w, h] = fitCanvas(monitor); drawScene(monitor.getContext("2d"), w, h, vTime + 1.5, VIDEOS[current]); }
  if (tcEl) tcEl.textContent = timecode(videoEl ? videoEl.currentTime : vTime);
  drawWaves();
  if (!mFill) { /* not the music page */ }
  else if (analyser && playing >= 0) {
    const buf = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(buf);
    let sum = 0; for (const v of buf) sum += v * v;
    const db = 20 * Math.log10(Math.sqrt(sum / buf.length) || 1e-9);
    document.getElementById("m-db").textContent = db < -90 ? "−∞ dBFS" : `${db.toFixed(1).replace("-", "−")} dBFS`;
    document.getElementById("m-fill").style.width = `${Math.max(0, Math.min(100, (db + 48) / 48 * 100))}%`;
  } else { document.getElementById("m-fill").style.width = "0"; document.getElementById("m-db").textContent = "−∞ dBFS"; }
  requestAnimationFrame(frame);
}
document.fonts && document.fonts.ready.then(drawThumbs);
drawThumbs();
addEventListener("resize", drawThumbs);
requestAnimationFrame(frame);
