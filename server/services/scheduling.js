/**
 * Business rules of the appointment calendar.
 *  - a dentist works on his/her workDays (1 = Monday … 6 = Saturday) between startHour and endHour (local time)
 *  - appointments start every 30 minutes and last as long as the service
 *  - two active appointments (pending / confirmed) of the same dentist may not overlap
 *  - no bookings on public holidays, in the past, less than 1 hour ahead or more than 90 days ahead
 */
const Appointment = require('../models/appointment');
const { holidayOn } = require('./holidays');
const { HttpError } = require('../utils/http');

const STEP_MIN = 30;
const MIN_LEAD_MS = 60 * 60 * 1000;
const MAX_AHEAD_DAYS = 90;
const ACTIVE = ['pending', 'confirmed'];

const pad = (n) => String(n).padStart(2, '0');
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/** Why the dentist cannot work on that date (or null). */
async function closedReason(dentist, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  if (Number.isNaN(day.getTime())) return 'Невалиден датум';
  if (!dentist.active) return 'Стоматологот моментално не прима пациенти';
  if (!dentist.workDays.includes(day.getDay())) return 'Стоматологот не работи тој ден';
  const holiday = await holidayOn(dateStr);
  if (holiday) return `Државен празник: ${holiday.localName || holiday.name}`;
  return null;
}

/** All slots of a day with a free / taken flag. */
async function daySlots(dentist, service, dateStr, { excludeId } = {}) {
  const reason = await closedReason(dentist, dateStr);
  if (reason) return { date: dateStr, closed: reason, slots: [] };
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0);
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0);
  const filter = { dentist: dentist._id, status: { $in: ACTIVE }, start: { $lt: dayEnd }, end: { $gt: dayStart } };
  if (excludeId) filter._id = { $ne: excludeId };
  const busy = await Appointment.find(filter).select('start end');
  const now = Date.now();
  const slots = [];
  for (let t = dentist.startHour * 60; t + service.durationMin <= dentist.endHour * 60; t += STEP_MIN) {
    const start = new Date(y, m - 1, d, 0, t);
    const end = new Date(start.getTime() + service.durationMin * 60000);
    const taken = busy.some((b) => overlaps(start, end, b.start, b.end));
    const tooSoon = start.getTime() < now + MIN_LEAD_MS;
    slots.push({ start, end, free: !taken && !tooSoon });
  }
  return { date: dateStr, closed: null, slots };
}

/** Throws 400/409 if the appointment cannot be booked at `start`. */
async function assertBookable(dentist, service, start, opts = {}) {
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) throw new HttpError(400, 'Невалиден термин', { start: 'невалиден датум' });
  if (s.getTime() < Date.now() + MIN_LEAD_MS) throw new HttpError(400, 'Терминот мора да е барем 1 час однапред', { start: 'премногу рано' });
  if (s.getTime() > Date.now() + MAX_AHEAD_DAYS * 864e5) throw new HttpError(400, `Може да се закажува најмногу ${MAX_AHEAD_DAYS} дена однапред`, { start: 'премногу далеку' });
  const { closed, slots } = await daySlots(dentist, service, localDateStr(s), opts);
  if (closed) throw new HttpError(400, closed, { start: closed });
  const slot = slots.find((x) => x.start.getTime() === s.getTime());
  if (!slot) throw new HttpError(400, 'Терминот не е во работното време на стоматологот', { start: 'надвор од работно време' });
  if (!slot.free) throw new HttpError(409, 'Терминот е веќе зафатен – изберете друг', { start: 'зафатен' });
  return new Date(s.getTime() + service.durationMin * 60000);
}

module.exports = { daySlots, assertBookable, localDateStr, ACTIVE, MIN_LEAD_MS };
