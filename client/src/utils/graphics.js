/**
 * Generated portrait (SVG data URI) for dentists without a photo:
 * a friendly doctor illustration in a colour derived from the name.
 */
const PALETTE = ['#0fa3a3', '#2f5bd3', '#7a4fd6', '#e0679a', '#c77d00', '#2e9e6a', '#c2412b'];
const SKIN = ['#f6d3b8', '#e8b896', '#d19c76', '#f3c9a8'];
const HAIR = ['#2b2118', '#6b4a2b', '#a87b4f', '#1f2a44', '#8d5a3b'];

function hash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function doctorUri(name = '', female = false) {
  const h = hash(name);
  const coat = PALETTE[h % PALETTE.length];
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const hair = HAIR[(h >>> 6) % HAIR.length];
  const longHair = female
    ? `<path d="M128 150 Q118 70 200 62 Q282 70 272 150 L276 250 Q250 236 248 190 L152 190 Q150 236 124 250 Z" fill="${hair}"/>`
    : `<path d="M140 140 Q138 74 200 70 Q262 74 260 140 Q244 108 200 106 Q156 108 140 140 Z" fill="${hair}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 340">
  <rect width="400" height="340" fill="#e3f7f5"/>
  <circle cx="330" cy="60" r="34" fill="#ffffff" opacity=".7"/>
  <circle cx="60" cy="280" r="50" fill="#ffffff" opacity=".5"/>
  ${female ? longHair : ''}
  <path d="M90 340 Q96 250 200 236 Q304 250 310 340 Z" fill="#ffffff"/>
  <path d="M168 238 L200 290 L232 238" fill="${coat}"/>
  <path d="M90 340 Q96 250 168 238 L184 340 Z M310 340 Q304 250 232 238 L216 340 Z" fill="${coat}" opacity=".18"/>
  <rect x="182" y="196" width="36" height="46" rx="12" fill="${skin}"/>
  <ellipse cx="200" cy="150" rx="62" ry="70" fill="${skin}"/>
  ${female ? '' : longHair}
  <circle cx="178" cy="152" r="6" fill="#10264a"/><circle cx="222" cy="152" r="6" fill="#10264a"/>
  <path d="M182 182 Q200 196 218 182" stroke="#10264a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M150 262 Q150 300 186 304" stroke="#10264a" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="190" cy="304" r="9" fill="#10264a"/>
  <rect x="236" y="270" width="40" height="14" rx="4" fill="${coat}"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
