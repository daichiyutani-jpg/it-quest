// オリジナルキャラクター「ピコ」（ITの世界に住む光の精霊）。外部素材を使わずSVGで描く。
// stage 0〜4 でマント・杖などの装備が増える。
export function pico(stage = 0, mood = 'happy', size = 96) {
  const capes = ['', '#ffb54d', '#ff7a8a', '#8f7bff', '#3ecf9a'];
  const cape = capes[stage] || '';
  const eyes = mood === 'sad'
    ? '<path d="M38 52 q5 -4 10 0 M62 52 q5 -4 10 0" stroke="#2b2f5c" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : mood === 'wow'
      ? '<circle cx="43" cy="52" r="6" fill="#2b2f5c"/><circle cx="67" cy="52" r="6" fill="#2b2f5c"/><circle cx="45" cy="50" r="2" fill="#fff"/><circle cx="69" cy="50" r="2" fill="#fff"/>'
      : '<ellipse cx="43" cy="53" rx="5" ry="6.5" fill="#2b2f5c"/><ellipse cx="67" cy="53" rx="5" ry="6.5" fill="#2b2f5c"/><circle cx="45" cy="50.5" r="2" fill="#fff"/><circle cx="69" cy="50.5" r="2" fill="#fff"/>';
  const mouth = mood === 'sad' ? '<path d="M50 70 q5 -4 10 0" stroke="#2b2f5c" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    : '<path d="M48 66 q7 7 14 0" stroke="#2b2f5c" stroke-width="2.5" fill="#ff8fa3" stroke-linecap="round"/>';
  return `<svg class="pico" width="${size}" height="${size}" viewBox="0 0 110 110" aria-hidden="true">
    <defs><radialGradient id="pb${stage}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e9fbff"/><stop offset="0.55" stop-color="#7fdcff"/><stop offset="1" stop-color="#3aa8f0"/></radialGradient></defs>
    ${cape ? `<path d="M25 70 Q55 112 85 70 L80 92 Q55 104 30 92 Z" fill="${cape}" opacity=".95"/>` : ''}
    <line x1="55" y1="22" x2="55" y2="8" stroke="#3aa8f0" stroke-width="3"/>
    <circle cx="55" cy="7" r="6" fill="#ffe066" stroke="#ffb703" stroke-width="2"/>
    <text x="55" y="10" font-size="8" text-anchor="middle" fill="#a26700" font-weight="700">1</text>
    <ellipse cx="55" cy="60" rx="36" ry="38" fill="url(#pb${stage})" stroke="#2b8fd6" stroke-width="2"/>
    <ellipse cx="33" cy="64" rx="6" ry="3.5" fill="#ff9fb4" opacity=".7"/><ellipse cx="77" cy="64" rx="6" ry="3.5" fill="#ff9fb4" opacity=".7"/>
    ${eyes}${mouth}
    ${stage >= 2 ? '<path d="M30 30 L40 20 L48 30 L55 18 L62 30 L70 20 L80 30 Z" fill="#ffd166" stroke="#e0a100" stroke-width="1.5"/>' : ''}
    ${stage >= 3 ? '<line x1="92" y1="40" x2="92" y2="96" stroke="#8d5a2b" stroke-width="4" stroke-linecap="round"/><circle cx="92" cy="36" r="7" fill="#b8f2ff" stroke="#3aa8f0" stroke-width="2"/>' : ''}
    ${stage >= 4 ? '<circle cx="18" cy="30" r="3" fill="#fff6a8"/><circle cx="95" cy="14" r="2.5" fill="#fff6a8"/><circle cx="12" cy="80" r="2" fill="#fff6a8"/>' : ''}
  </svg>`;
}

export const AREA_ICON = { S: '🏰', M: '⚙️', T: '🔮' };
