// 図解・アニメーション（学習アプリ共通ルール §6）。画像ファイルを使わず、データから SVG / HTML+CSS で描く。
// 図は「コマ」に分かれ、▶再生・⏸一時停止・コマ送り・最初からができる。
// 動きを減らす設定（prefers-reduced-motion）の端末では自動再生せず、最初から全部を表示する（コマ送りは使える）。
// データの形は docs/CONTENT_SCHEMA.md の「図解・アニメーション（figures）」。
import { esc } from './dom.js';

const W = 340;
const FS = 13;

/** 全角を1、半角を0.55として、1行 max 字で折り返す */
function wrap(text, max) {
  const out = [];
  let line = ''; let w = 0;
  for (const ch of String(text || '')) {
    const cw = /[\x20-\x7e]/.test(ch) ? 0.55 : 1;
    if (w + cw > max && line) { out.push(line); line = ''; w = 0; }
    line += ch; w += cw;
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

function svgText(x, y, text, max, { size = FS, weight = 400, anchor = 'middle', cls = '' } = {}) {
  const lines = wrap(text, max);
  const lh = size * 1.3;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  return { h: lines.length * lh, svg: `<text class="${cls}" x="${x}" y="${y0}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="middle">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>` };
}

const ARROW = '<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="fig-arrowhead"/></marker></defs>';

function box(x, y, w, h, label, note, k, accent) {
  const t = svgText(x + w / 2, y + (note ? h * 0.36 : h / 2), label, Math.floor((w - 12) / FS), { weight: 700 });
  const n = note ? svgText(x + w / 2, y + h * 0.72, note, Math.floor((w - 12) / 11.5), { size: 11, cls: 'fig-note' }) : { svg: '' };
  return `<g class="fig-f" data-frame="${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="fig-box${accent ? ' fig-accent' : ''}"/>${t.svg}${n.svg}</g>`;
}

function nodeH(label, note, w) {
  const a = wrap(label, Math.floor((w - 12) / FS)).length;
  const b = note ? wrap(note, Math.floor((w - 12) / 11.5)).length : 0;
  return Math.max(40, 14 + a * FS * 1.3 + b * 11 * 1.3 + (note ? 8 : 0));
}

function flowSVG(f) {
  const nodes = f.nodes || [];
  if (f.dir === 'h' && nodes.length <= 4) {
    const gap = 16; const w = (W - gap * (nodes.length - 1)) / nodes.length;
    const h = Math.max(...nodes.map((n) => nodeH(n.label, n.note, w)));
    let s = '';
    nodes.forEach((n, k) => {
      const x = k * (w + gap);
      s += box(x, 4, w, h, n.label, n.note, k, k === 0);
      if (k > 0) s += `<line class="fig-f fig-line" data-frame="${k}" x1="${x - gap + 1}" y1="${4 + h / 2}" x2="${x - 2}" y2="${4 + h / 2}" marker-end="url(#fa)"/>`;
    });
    return { svg: s, h: h + 8, frames: nodes.length };
  }
  const gap = 22; let y = 4; let s = '';
  nodes.forEach((n, k) => {
    const h = nodeH(n.label, n.note, W - 40);
    if (k > 0) s += `<line class="fig-f fig-line" data-frame="${k}" x1="${W / 2}" y1="${y - gap + 2}" x2="${W / 2}" y2="${y - 3}" marker-end="url(#fa)"/>`;
    s += box(20, y, W - 40, h, n.label, n.note, k, k === 0);
    y += h + gap;
  });
  return { svg: s, h: y - gap + 4, frames: nodes.length };
}

function cycleSVG(f) {
  const nodes = f.nodes || [];
  const n = nodes.length;
  const R = n <= 4 ? 105 : 115; const cx = W / 2;
  const bw = n <= 4 ? 116 : 100;
  // 円の上の箱には番号と名前だけを入れ、説明（note）は円の下に番号つきで並べる（狭い箱に長い説明を詰めない）
  const label = (nd, k) => (nodes.some((x) => x.note) ? `${k + 1}. ${nd.label}` : nd.label);
  const bh = Math.max(...nodes.map((nd, k) => nodeH(label(nd, k), null, bw)));
  const cy = R + bh / 2 + 4;
  const pos = nodes.map((_, k) => { const a = -Math.PI / 2 + (2 * Math.PI * k) / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  let s = '';
  nodes.forEach((nd, k) => {
    const [x, y] = pos[k];
    s += box(x - bw / 2, y - bh / 2, bw, bh, label(nd, k), null, k, k === 0);
  });
  let y = cy + R + bh / 2 + 14;
  nodes.forEach((nd, k) => {
    if (!nd.note) return;
    const lines = wrap(`${k + 1}. ${nd.note}`, Math.floor((W - 8) / 12));
    const t = lines.map((l, i) => `<tspan x="4" dy="${i ? 16 : 0}">${esc(l)}</tspan>`).join('');
    s += `<text class="fig-f fig-note" data-frame="${k}" x="4" y="${y}" font-size="12" dominant-baseline="hanging">${t}</text>`;
    y += lines.length * 16 + 6;
  });
  const bottom = y + 4;
  // 次のノードへの矢印（円周上の弧）
  nodes.forEach((_, k) => {
    const a1 = -Math.PI / 2 + (2 * Math.PI * k) / n + 0.42;
    const a2 = -Math.PI / 2 + (2 * Math.PI * (k + 1)) / n - 0.42;
    const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
    const p2 = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)];
    s += `<path class="fig-f fig-line" data-frame="${(k + 1) % n === 0 ? n - 1 : k + 1}" d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" marker-end="url(#fa)"/>`;
  });
  return { svg: s, h: Math.max(cy + R + bh / 2 + 8, bottom), frames: n };
}

function layersSVG(f) {
  const rows = f.rows || [];
  let y = 4; let s = '';
  rows.forEach((r, k) => {
    const inset = rows.length > 3 ? 0 : 0;
    const h = nodeH(r.label, r.note, W - 8);
    s += box(4 + inset, y, W - 8 - inset * 2, h, r.label, r.note, k, false);
    y += h + 6;
  });
  return { svg: s, h: y, frames: rows.length };
}

function svgWrap(inner, h, title) {
  return `<svg class="fig-svg" viewBox="0 0 ${W} ${Math.ceil(h)}" role="img" aria-label="${esc(title || '図')}">${ARROW}${inner}</svg>`;
}

/** 図1つ分の HTML と、コマ数 */
export function figureBody(f) {
  switch (f.type) {
    case 'flow': { const r = flowSVG(f); return { html: svgWrap(r.svg, r.h, f.title), frames: r.frames }; }
    case 'cycle': { const r = cycleSVG(f); return { html: svgWrap(r.svg, r.h, f.title), frames: r.frames }; }
    case 'layers': { const r = layersSVG(f); return { html: svgWrap(r.svg, r.h, f.title), frames: r.frames }; }
    case 'compare': {
      const cols = f.cols || []; const rows = f.rows || [];
      return {
        html: `<div class="fig-table-wrap"><table class="fig-table"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, k) => `<tr class="fig-f" data-frame="${k}">${r.map((c, i) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`,
        frames: rows.length,
      };
    }
    case 'steps': {
      const st = f.steps || [];
      return { html: `<ol class="fig-steps">${st.map((x, k) => `<li class="fig-f" data-frame="${k}"><span>${esc(x.text)}</span>${x.expr ? `<code>${esc(x.expr)}</code>` : ''}</li>`).join('')}</ol>`, frames: st.length };
    }
    case 'tree': {
      const ch = f.children || [];
      return {
        html: `<div class="fig-tree"><div class="fig-root">${esc(f.root)}</div><ul>${ch.map((c, k) => `<li class="fig-f" data-frame="${k}"><b>${esc(c.label)}</b>${c.children?.length ? `<ul>${c.children.map((g) => `<li>${esc(g.label)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul></div>`,
        frames: ch.length,
      };
    }
    default:
      return { html: '<p class="muted small">（この形式の図は表示できません）</p>', frames: 1 };
  }
}

export function figureHTML(f, idx = 0) {
  const b = figureBody(f);
  return `<figure class="fig" data-fig="${idx}" data-frames="${b.frames}">
    <figcaption class="fig-title">📊 ${esc(f.title)}</figcaption>
    <div class="fig-stage">${b.html}</div>
    <div class="fig-ctrl" role="group" aria-label="図の操作">
      <button class="btn ghost small" data-act="reset">⏮ 最初から</button>
      <button class="btn ghost small" data-act="play" aria-label="再生">▶ 再生</button>
      <button class="btn ghost small" data-act="step" aria-label="コマ送り">コマ送り ›</button>
      <span class="fig-count tiny muted"></span>
    </div>
    ${f.caption ? `<p class="fig-cap small">${esc(f.caption)}</p>` : ''}
  </figure>`;
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** root の中の図に操作を付ける。返り値は後片付け用の関数（画面を離れるとき） */
export function bindFigures(root, { onView } = {}) {
  const timers = [];
  root.querySelectorAll('figure.fig').forEach((fig) => {
    const n = Number(fig.dataset.frames) || 1;
    let frame = reduced() ? n - 1 : 0;
    let timer = null;
    const playBtn = fig.querySelector('[data-act="play"]');
    const count = fig.querySelector('.fig-count');
    const show = () => {
      fig.querySelectorAll('.fig-f').forEach((el) => el.classList.toggle('off', Number(el.dataset.frame) > frame));
      count.textContent = `${frame + 1} / ${n}`;
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = '▶ 再生'; playBtn.setAttribute('aria-label', '再生'); };
    const play = () => {
      if (frame >= n - 1) frame = 0;
      show();
      playBtn.textContent = '⏸ 一時停止'; playBtn.setAttribute('aria-label', '一時停止');
      timer = setInterval(() => { if (frame >= n - 1) { stop(); return; } frame++; show(); }, 1400);
      timers.push(() => clearInterval(timer));
    };
    fig.querySelector('[data-act="reset"]').addEventListener('click', () => { stop(); frame = 0; show(); onView?.(); });
    fig.querySelector('[data-act="step"]').addEventListener('click', () => { stop(); frame = frame >= n - 1 ? 0 : frame + 1; show(); onView?.(); });
    playBtn.addEventListener('click', () => { if (timer) stop(); else { play(); onView?.(); } });
    show();
    if (!reduced() && n > 1) play();
  });
  return () => timers.forEach((f) => f());
}
