/**
 * Interactive dental chart (FDI numbering). Upper jaw: 18…11 | 21…28, lower jaw: 48…41 | 31…38.
 * Teeth that have entries in the dental record are coloured; clicking a tooth selects it.
 */
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const width = (t) => ({ 1: 26, 2: 24, 3: 26, 4: 28, 5: 28, 6: 36, 7: 34, 8: 32 }[t % 10]);

function Row({ teeth, y, upper, marked, selected, onSelect }) {
  const total = teeth.reduce((s, t) => s + width(t) + 4, 0);
  let x = (640 - total) / 2;
  return teeth.map((t, i) => {
    const w = width(t);
    const center = (i - 7.5) / 7.5; // -1 … 1
    const curve = 26 * center * center; // arch shape
    const ty = upper ? y + curve : y - curve;
    const h = t % 10 >= 6 ? 40 : 46;
    const cx = x;
    x += w + 4;
    const count = marked[t] || 0;
    const fill = selected === t ? '#10264a' : count ? '#0fa3a3' : '#ffffff';
    const label = selected === t || count ? '#ffffff' : '#10264a';
    const r = 10;
    // crown with a "root" notch: rounded rect + small bumps for molars
    return (
      <g key={t} className="tooth" onClick={() => onSelect?.(selected === t ? null : t)} role="button" aria-label={`Заб ${t}${count ? `, ${count} записи` : ''}`} tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(selected === t ? null : t)}>
        <rect x={cx} y={upper ? ty : ty - h} width={w} height={h} rx={r} fill={fill} stroke={count ? '#0b7f80' : '#c9d6e3'} strokeWidth="2" />
        {t % 10 >= 6 && <path d={`M${cx + w / 2} ${upper ? ty + h - 6 : ty - h + 6} v${upper ? -10 : 10}`} stroke={label} strokeOpacity=".35" strokeWidth="2" />}
        <text x={cx + w / 2} y={upper ? ty + h / 2 + 5 : ty - h / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill={label} fontFamily="Manrope, sans-serif">{t}</text>
        {count > 1 && <circle cx={cx + w - 4} cy={upper ? ty + 4 : ty - h + 4} r="7" fill="#ff8a65" />}
        {count > 1 && <text x={cx + w - 4} y={upper ? ty + 8 : ty - h + 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">{count}</text>}
      </g>
    );
  });
}

export default function ToothChart({ records = [], selected = null, onSelect }) {
  const marked = {};
  records.forEach((r) => { if (r.tooth) marked[r.tooth] = (marked[r.tooth] || 0) + 1; });
  return (
    <svg viewBox="0 0 640 260" className="tooth-chart" aria-label="Забен статус">
      <text x="320" y="16" textAnchor="middle" fontSize="11" fill="#6b7a93" fontWeight="700">ГОРНА ВИЛИЦА</text>
      <Row teeth={UPPER} y={26} upper marked={marked} selected={selected} onSelect={onSelect} />
      <line x1="320" y1="22" x2="320" y2="240" stroke="#e6ecf3" strokeDasharray="4 4" />
      <line x1="40" y1="130" x2="600" y2="130" stroke="#e6ecf3" strokeDasharray="4 4" />
      <Row teeth={LOWER} y={234} upper={false} marked={marked} selected={selected} onSelect={onSelect} />
      <text x="320" y="256" textAnchor="middle" fontSize="11" fill="#6b7a93" fontWeight="700">ДОЛНА ВИЛИЦА</text>
    </svg>
  );
}
