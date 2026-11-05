// 画面づくりの小道具
import { esc } from '../core/util.js';
export { esc };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 文字列中の改行と簡単な強調（**太字**）を表示用に変換 */
export function rich(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}

/** 等幅で表示したい（表・擬似コードなど）行が含まれる場合は pre に */
export function richBlock(text) {
  const t = String(text ?? '');
  if (/\n {2,}|\n[│|┃]|^ {2,}|\n\s*\d+:|〔|^\s*[+-]{3,}/m.test(t)) return `<pre class="code">${esc(t)}</pre>`;
  return `<p>${rich(t)}</p>`;
}

export function bar(p, color = 'var(--accent)', label = '') {
  const w = Math.round(Math.max(0, Math.min(1, p)) * 100);
  return `<div class="bar" role="progressbar" aria-valuenow="${w}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}"><i style="width:${w}%;background:${color}"></i></div>`;
}

let toastTimer = null;
export function toast(msg, ms = 2400) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/** 確認ダイアログ。Promise<boolean> */
export function confirmDialog({ title, body, ok = 'OK', cancel = 'やめる', danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3><div class="modal-body">${body}</div>
      <div class="row gap"><button class="btn ghost" data-x="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-x="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]');
      if (!b && e.target !== wrap) return;
      wrap.remove();
      resolve(b ? b.dataset.x === '1' : false);
    });
  });
}

/** 時間の選択肢（10〜120分＋自由入力） */
export const TIME_CHOICES = [10, 15, 30, 45, 60, 90, 120];
export function timeChips(name, value, { allowZero = false } = {}) {
  const custom = !TIME_CHOICES.includes(value) && !(allowZero && value === 0);
  return `<div class="chips" data-chips="${name}">
    ${allowZero ? `<button type="button" class="chip ${value === 0 ? 'on' : ''}" data-v="0">0分</button>` : ''}
    ${TIME_CHOICES.map((m) => `<button type="button" class="chip ${value === m ? 'on' : ''}" data-v="${m}">${m}分</button>`).join('')}
    <label class="chip custom ${custom ? 'on' : ''}">自由<input type="number" inputmode="numeric" min="0" max="900" step="5" value="${custom ? value : ''}" data-custom="${name}" aria-label="自由入力（分）">分</label>
  </div>`;
}
/** chips の選択を読み書きする */
export function bindChips(root, name, onChange) {
  const box = root.querySelector(`[data-chips="${name}"]`);
  if (!box) return;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    box.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    const inp = box.querySelector('[data-custom]'); if (inp) inp.value = '';
    onChange(Number(b.dataset.v));
  });
  const inp = box.querySelector('[data-custom]');
  inp?.addEventListener('input', () => {
    const v = Math.max(0, Math.min(900, Math.round(Number(inp.value) || 0)));
    box.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    inp.closest('.chip').classList.add('on');
    if (inp.value !== '') onChange(v);
  });
}

export function choiceChips(name, options, value) {
  return `<div class="chips" data-chips="${name}">${options.map(([v, label]) => `<button type="button" class="chip ${String(value) === String(v) ? 'on' : ''}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
}
export function bindChoice(root, name, onChange) {
  const box = root.querySelector(`[data-chips="${name}"]`);
  box?.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    box.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    onChange(b.dataset.v);
  });
}
