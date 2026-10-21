/**
 * Application-level validation (before data reaches the controllers / Mongoose).
 * Each rule set maps a (dotted) field path to constraints.
 * With { partial: true } (PUT/PATCH) required fields are only checked if present.
 */
const {
  PATTERNS, SPECIALTIES, CATEGORIES, ROLES,
} = require('../utils/patterns');
const { HttpError } = require('../utils/http');

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const isEmpty = (v) => v === undefined || v === null || v === '';

function checkField(value, rule) {
  if (rule.type === 'number' || rule.type === 'integer') {
    const n = Number(value);
    if (Number.isNaN(n)) return 'мора да е број';
    if (rule.type === 'integer' && !Number.isInteger(n)) return 'мора да е цел број';
    if (rule.min !== undefined && n < rule.min) return `минимум ${rule.min}`;
    if (rule.max !== undefined && n > rule.max) return `максимум ${rule.max}`;
    return null;
  }
  if (rule.type === 'date') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'невалиден датум';
    return null;
  }
  if (rule.type === 'intArray') {
    if (!Array.isArray(value) || !value.length) return 'изберете барем една вредност';
    if (!value.every((v) => Number.isInteger(v) && (!rule.values || rule.values.includes(v)))) return `дозволени вредности: ${(rule.values || []).join(', ')}`;
    return null;
  }
  if (rule.type === 'boolean') {
    return typeof value === 'boolean' ? null : 'мора да е true/false';
  }
  if (typeof value !== 'string') return 'мора да е текст';
  const s = value.trim();
  if (rule.minLength && s.length < rule.minLength) return `најмалку ${rule.minLength} знаци`;
  if (rule.maxLength && s.length > rule.maxLength) return `најмногу ${rule.maxLength} знаци`;
  if (rule.enum && !rule.enum.includes(s)) return `дозволени вредности: ${rule.enum.join(', ')}`;
  if (rule.pattern && !rule.pattern.test(s)) return rule.message || 'невалиден формат';
  return null;
}

const validate = (rules, { partial = false } = {}) => (req, _res, next) => {
  const errors = {};
  for (const [path, rule] of Object.entries(rules)) {
    const value = get(req.body, path);
    if (isEmpty(value)) {
      if (rule.required && !partial) errors[path] = 'задолжително поле';
      continue;
    }
    const err = checkField(value, rule);
    if (err) errors[path] = err;
  }
  if (Object.keys(errors).length) return next(new HttpError(400, 'Податоците не се валидни', errors));
  return next();
};

/** Validates :id style route params as MongoDB ObjectIds */
const validateId = (param = 'id') => (req, _res, next) =>
  PATTERNS.objectId.test(req.params[param])
    ? next()
    : next(new HttpError(400, `Невалиден идентификатор „${req.params[param]}“`));

const rules = {
  register: {
    username: { required: true, pattern: PATTERNS.username, message: '3–20 знаци: букви, бројки, . и _' },
    email: { required: true, pattern: PATTERNS.email, message: 'невалидна е-пошта' },
    password: { required: true, pattern: PATTERNS.password, message: 'мин. 8 знаци, барем една буква и една бројка' },
    fullName: { required: true, pattern: PATTERNS.personName, message: 'невалидно име' },
    phone: { pattern: PATTERNS.phone, message: 'невалиден телефон (пр. +389 70 123 456)' },
    emailNotifications: { type: 'boolean' },
  },
  login: {
    email: { required: true, pattern: PATTERNS.email, message: 'невалидна е-пошта' },
    password: { required: true, minLength: 1 },
  },
  userUpdate: {
    role: { enum: ROLES },
    fullName: { pattern: PATTERNS.personName, message: 'невалидно име' },
    phone: { pattern: PATTERNS.phone, message: 'невалиден телефон' },
    emailNotifications: { type: 'boolean' },
  },
  dentist: {
    firstName: { required: true, pattern: PATTERNS.personName, message: 'невалидно име' },
    lastName: { required: true, pattern: PATTERNS.personName, message: 'невалидно презиме' },
    specialty: { required: true, enum: SPECIALTIES },
    bio: { maxLength: 1000 },
    yearsExperience: { type: 'integer', min: 0, max: 50 },
    photoUrl: { pattern: PATTERNS.url, message: 'невалиден URL' },
    workDays: { type: 'intArray', values: [1, 2, 3, 4, 5, 6] },
    startHour: { type: 'integer', min: 7, max: 14 },
    endHour: { type: 'integer', min: 12, max: 21 },
    active: { type: 'boolean' },
  },
  service: {
    name: { required: true, pattern: PATTERNS.serviceName, message: 'невалидно име (3–60 знаци)' },
    category: { required: true, enum: CATEGORIES },
    description: { maxLength: 800 },
    price: { required: true, type: 'integer', min: 0, max: 200000 },
    durationMin: { required: true, type: 'integer', min: 15, max: 120 },
    active: { type: 'boolean' },
  },
  appointment: {
    dentist: { required: true, pattern: PATTERNS.objectId, message: 'изберете стоматолог' },
    service: { required: true, pattern: PATTERNS.objectId, message: 'изберете услуга' },
    start: { required: true, type: 'date' },
    note: { maxLength: 300 },
  },
  cancel: {
    reason: { maxLength: 200 },
  },
  status: {
    status: { required: true, enum: ['confirmed', 'completed', 'cancelled'] },
    reason: { maxLength: 200 },
  },
  review: {
    appointment: { required: true, pattern: PATTERNS.objectId, message: 'невалиден термин' },
    rating: { required: true, type: 'integer', min: 1, max: 5 },
    text: { required: true, minLength: 10, maxLength: 500 },
  },
  reviewUpdate: {
    rating: { type: 'integer', min: 1, max: 5 },
    text: { minLength: 10, maxLength: 500 },
  },
  reply: {
    reply: { required: true, minLength: 2, maxLength: 500 },
  },
  record: {
    patient: { required: true, pattern: PATTERNS.objectId, message: 'невалиден пациент' },
    tooth: { type: 'integer', min: 11, max: 48 },
    procedure: { required: true, minLength: 2, maxLength: 80 },
    notes: { maxLength: 500 },
  },
};

module.exports = { validate, validateId, rules };
