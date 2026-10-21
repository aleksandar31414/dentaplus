/**
 * "Pipes" – pure transformation functions used in the views (React equivalent of Angular pipes).
 * They can be chained with `pipe(value, fn1, fn2, ...)`, e.g. pipe(text, truncate(80), capitalize).
 */
export const pipe = (value, ...fns) => fns.reduce((acc, fn) => fn(acc), value);

const two = (n) => String(n).padStart(2, '0');
export const MONTHS = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември'];
export const MONTHS_SHORT = ['јан', 'фев', 'мар', 'апр', 'мај', 'јун', 'јул', 'авг', 'сеп', 'окт', 'ное', 'дек'];
export const DAYS = ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'];
export const DAYS_SHORT = ['Нед', 'Пон', 'Вто', 'Сре', 'Чет', 'Пет', 'Саб'];

/** 1) Date -> "24.10.2026" (short) · "24 октомври 2026, 10:30" (long) · "10:30" (time) · "сабота, 24 октомври" (day) · "2026-10-24" (iso) */
export function formatDate(date, format = 'short') {
  if (!date) return '–';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '–';
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  switch (format) {
    case 'long': return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
    case 'time': return time;
    case 'day': return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    case 'iso': return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
    default: return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
}

/** 2) Price -> "2.500 ден." */
export const price = (v) => (v == null || v === '' ? '–' : `${Number(v).toLocaleString('de-DE')} ден.`);

/** 3) Minutes -> "1 ч 30 мин" */
export function duration(min) {
  const m = Number(min) || 0;
  const h = Math.floor(m / 60);
  return [h ? `${h} ч` : '', m % 60 ? `${m % 60} мин` : ''].filter(Boolean).join(' ') || '0 мин';
}

/** 4) Specialty / category / status -> Macedonian label (+ icon / colour) */
export const SPECIALTY = {
  general: 'Општа стоматологија', orthodontics: 'Ортодонција', surgery: 'Орална хирургија', endodontics: 'Ендодонција',
  pediatric: 'Детска стоматологија', prosthetics: 'Протетика', periodontics: 'Пародонтологија',
};
export const specialtyLabel = (s) => SPECIALTY[s] || s;
export const CATEGORY = {
  preventive: { label: 'Превенција', icon: 'bi-shield-check', color: '#0fa3a3', bg: '#e3f7f5' },
  restorative: { label: 'Пломби и канали', icon: 'bi-bandaid', color: '#2f5bd3', bg: '#e7eefc' },
  cosmetic: { label: 'Естетика', icon: 'bi-stars', color: '#c77d00', bg: '#fff4d6' },
  surgery: { label: 'Хирургија', icon: 'bi-scissors', color: '#c2412b', bg: '#fde8e4' },
  orthodontics: { label: 'Ортодонција', icon: 'bi-grid-3x2-gap', color: '#7a4fd6', bg: '#efe8fd' },
  pediatric: { label: 'За деца', icon: 'bi-emoji-smile', color: '#e0679a', bg: '#fde7f1' },
};
export const categoryLabel = (c) => CATEGORY[c]?.label || c;
export const STATUS = {
  pending: { label: 'Чека потврда', icon: 'bi-hourglass-split' },
  confirmed: { label: 'Потврден', icon: 'bi-check2-circle' },
  completed: { label: 'Завршен', icon: 'bi-clipboard2-check' },
  cancelled: { label: 'Откажан', icon: 'bi-x-circle' },
};
export const statusLabel = (s) => STATUS[s]?.label || s;

/** 5) Rating -> "★★★★☆" parts */
export const starParts = (rating) => {
  const r = Math.round(Number(rating) || 0);
  return ['★'.repeat(r), '★'.repeat(5 - r)];
};

/** 6) Doctor name -> "д-р Елена Николовска" */
export const doctor = (d) => (d ? `д-р ${d.firstName} ${d.lastName}` : '–');

/** 7) Text -> truncated text (curried so it can be used inside pipe()) */
export const truncate = (n = 100) => (text = '') => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

/** 8) First letter upper case */
export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** 9) Date -> relative time ("пред 2 ч.", "за 3 дена") */
export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  const abs = Math.abs(diff);
  const pre = diff >= 0 ? 'пред' : 'за';
  if (abs < 60) return 'сега';
  if (abs < 3600) return `${pre} ${Math.floor(abs / 60)} мин.`;
  if (abs < 86400) return `${pre} ${Math.floor(abs / 3600)} ч.`;
  if (abs < 86400 * 30) return `${pre} ${Math.floor(abs / 86400)} ${Math.floor(abs / 86400) === 1 ? 'ден' : 'дена'}`;
  return formatDate(date);
}

/** 10) Name -> initials ("Марија Стојанова" -> "МС") */
export const initials = (name = '') =>
  name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** 11) Working days [1..6] -> "Пон–Пет" style text */
export const workDaysText = (days = []) => days.map((d) => DAYS_SHORT[d]).join(', ');

/** 12) Phone -> clickable tel: link value */
export const telHref = (phone = '') => `tel:${phone.replace(/[^\d+]/g, '')}`;
