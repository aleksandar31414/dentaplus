/**
 * Client-side validation (third level of data integrity, after the server's
 * application level and Mongoose schema level). Same patterns as server/utils/patterns.js.
 */
export const PATTERNS = {
  username: /^[a-zA-Z0-9._]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
  personName: /^[\p{L}][\p{L}\s.'-]{1,59}$/u,
  phone: /^\+?[0-9 /-]{8,18}$/,
  serviceName: /^[\p{L}\d][\p{L}\d\s.,'()/+-]{2,59}$/u,
  url: /^https?:\/\/[^\s]+$/i,
  integer: /^\d+$/,
};

export const SPECIALTIES = ['general', 'orthodontics', 'surgery', 'endodontics', 'pediatric', 'prosthetics', 'periodontics'];
export const CATEGORIES = ['preventive', 'restorative', 'cosmetic', 'surgery', 'orthodontics', 'pediatric'];
export const DURATIONS = [15, 30, 45, 60, 75, 90, 120];
export const TEETH = [1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q * 10 + n));

/** Rule helpers – each returns an error message or null */
export const required = (msg = 'Задолжително поле') => (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null);
export const matches = (rx, msg) => (v) => (v && !rx.test(String(v).trim()) ? msg : null);
export const oneOf = (list, msg = 'Изберете вредност од листата') => (v) => (v !== '' && v != null && !list.includes(v) ? msg : null);
export const minLen = (n) => (v) => (v && String(v).trim().length < n ? `Најмалку ${n} знаци` : null);
export const maxLen = (n) => (v) => (v && String(v).length > n ? `Најмногу ${n} знаци` : null);
export const range = (min, max, msg) => (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) || n < min || n > max ? msg || `Вредност меѓу ${min} и ${max}` : null;
};
export const integer = (v) => (v !== '' && v != null && !PATTERNS.integer.test(String(v)) ? 'Мора да е цел број' : null);
export const sameAs = (getOther, msg) => (v, values) => (v !== getOther(values) ? msg : null);
export const notEmptyList = (msg) => (v) => (!Array.isArray(v) || v.length === 0 ? msg : null);

/** validate(values, schema) -> { field: message } */
export function validate(values, schema) {
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const err = rule(get(values, field), values);
      if (err) { errors[field] = err; break; }
    }
  }
  return errors;
}

// ---------- form schemas ----------
export const loginSchema = {
  email: [required(), matches(PATTERNS.email, 'Невалидна е-пошта')],
  password: [required()],
};

export const registerSchema = {
  fullName: [required(), matches(PATTERNS.personName, 'Само букви, празно место, точка и цртичка')],
  username: [required(), matches(PATTERNS.username, '3–20 знаци: букви, бројки, точка и _')],
  email: [required(), matches(PATTERNS.email, 'Невалидна е-пошта (пр. ime@domen.mk)')],
  phone: [matches(PATTERNS.phone, 'Невалиден телефон (пр. +389 70 123 456)')],
  password: [required(), matches(PATTERNS.password, 'Мин. 8 знаци, барем една буква и една бројка')],
  confirmPassword: [required(), sameAs((v) => v.password, 'Лозинките не се совпаѓаат')],
};

export const dentistSchema = {
  firstName: [required(), matches(PATTERNS.personName, 'Невалидно име')],
  lastName: [required(), matches(PATTERNS.personName, 'Невалидно презиме')],
  specialty: [required(), oneOf(SPECIALTIES)],
  yearsExperience: [integer, range(0, 50, 'Искуство од 0 до 50 години')],
  startHour: [required(), integer, range(7, 14, 'Почеток од 7 до 14 ч.')],
  endHour: [required(), integer, range(12, 21, 'Крај од 12 до 21 ч.'), (v, all) => (Number(v) - Number(all.startHour) < 3 ? 'Работното време мора да е барем 3 часа' : null)],
  workDays: [notEmptyList('Изберете барем еден работен ден')],
  photoUrl: [matches(PATTERNS.url, 'URL мора да почнува со http:// или https://')],
  bio: [maxLen(1000)],
};

export const serviceSchema = {
  name: [required(), matches(PATTERNS.serviceName, 'Невалидно име (3–60 знаци)')],
  category: [required(), oneOf(CATEGORIES)],
  price: [required(), integer, range(0, 200000, 'Цена од 0 до 200.000 ден.')],
  durationMin: [required(), (v) => (DURATIONS.includes(Number(v)) ? null : 'Изберете траење')],
  description: [maxLen(800)],
};

export const bookingSchema = {
  serviceId: [required('Изберете услуга')],
  dentistId: [required('Изберете стоматолог')],
  start: [required('Изберете слободен термин')],
  note: [maxLen(300)],
};

export const reviewSchema = {
  rating: [required('Изберете оценка'), range(1, 5, 'Оценка од 1 до 5')],
  text: [required('Напишете коментар'), minLen(10), maxLen(500)],
};

export const recordSchema = {
  procedure: [required('Внесете интервенција'), minLen(2), maxLen(80)],
  tooth: [(v) => (v === '' || v == null || TEETH.includes(Number(v)) ? null : 'Заб по FDI: 11–18, 21–28, 31–38, 41–48')],
  notes: [maxLen(500)],
};
