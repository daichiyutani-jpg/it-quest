// 効果音とBGM。音声ファイルは使わず、ブラウザの WebAudio で合成する（ファイルが無くても必ず動く）。
// 鳴らせない環境（古い端末・自動再生の制限）では何もしない。
let ctx = null;
let master = null;
let bgmTimer = null;
let settings = { se: true, bgm: false, volume: 0.6, muted: false };

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyVolume();
  } catch { ctx = null; }
  return ctx;
}
function applyVolume() { if (master) master.gain.value = settings.muted ? 0 : settings.volume * 0.5; }

export function configure(s) {
  settings = { ...settings, ...s };
  applyVolume();
  if (settings.bgm && !settings.muted) startBgm(); else stopBgm();
}
/** 最初のタップで呼ぶ（iPhoneは操作のあとでないと音が出ない） */
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); if (settings.bgm && !settings.muted) startBgm(); }

function tone(freq, start, dur, type = 'sine', vol = 0.3) {
  const c = ensure(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

const SE = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.12),
  correct: () => { tone(784, 0, 0.12, 'triangle'); tone(1175, 0.09, 0.22, 'triangle'); },
  wrong: () => { tone(330, 0, 0.16, 'sawtooth', 0.12); tone(262, 0.12, 0.25, 'sawtooth', 0.1); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle', 0.25)),
  page: () => tone(880, 0, 0.05, 'sine', 0.08),
  finish: () => [659, 784, 988].forEach((f, i) => tone(f, i * 0.12, 0.3, 'sine', 0.2)),
};
export function se(name) { if (!settings.se || settings.muted) return; try { SE[name]?.(); } catch { /* 無音で続行 */ } }

// 静かなBGM（学習の邪魔にならない、ゆっくりした分散和音）
const CHORDS = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]];
function startBgm() {
  if (bgmTimer || !ensure()) return;
  let i = 0;
  const play = () => {
    const ch = CHORDS[i++ % CHORDS.length];
    ch.forEach((f, k) => tone(f, k * 0.45, 2.2, 'sine', 0.05));
    tone(ch[0] / 2, 0, 3.2, 'sine', 0.04);
  };
  play();
  bgmTimer = setInterval(play, 3600);
}
function stopBgm() { clearInterval(bgmTimer); bgmTimer = null; }
