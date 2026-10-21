const Appointment = require('../models/appointment');
const Dentist = require('../models/dentist');
const Service = require('../models/service');
const Review = require('../models/review');
const Record = require('../models/record');
const User = require('../models/user');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');
const { assertBookable, ACTIVE } = require('../services/scheduling');
const { PATTERNS, APPOINTMENT_STATUSES } = require('../utils/patterns');

const CANCEL_BEFORE_MS = 24 * 3600 * 1000; // patients may cancel until 24 h before the appointment
const MAX_OPEN_PER_PATIENT = 3;

const populate = (q) =>
  q.populate('patient', 'username fullName email phone emailNotifications')
    .populate('dentist', 'firstName lastName specialty photoUrl')
    .populate('service', 'name category price durationMin')
    .populate('review');

const fmt = (d) => new Date(d).toLocaleString('mk-MK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function buildFilter(query, user) {
  const filter = {};
  if (user.role !== 'admin' || query.mine === 'true') filter.patient = user._id;
  else if (query.patient && PATTERNS.objectId.test(query.patient)) filter.patient = query.patient;
  if (query.dentist && PATTERNS.objectId.test(query.dentist)) filter.dentist = query.dentist;
  if (APPOINTMENT_STATUSES.includes(query.status)) filter.status = query.status;
  if (query.when === 'upcoming') filter.start = { $gte: new Date() };
  if (query.when === 'past') filter.start = { $lt: new Date() };
  if (query.date && PATTERNS.date.test(query.date)) {
    const [y, m, d] = query.date.split('-').map(Number);
    filter.start = { $gte: new Date(y, m - 1, d), $lt: new Date(y, m - 1, d + 1) };
  }
  return filter;
}

/** Patients see their own appointments, admins see all (with filters). */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 20);
  const filter = buildFilter(req.query, req.user);
  const sort = req.query.when === 'upcoming' || req.query.date ? { start: 1 } : { start: -1 };
  const [items, total] = await Promise.all([
    populate(Appointment.find(filter).sort(sort).skip(skip).limit(limit)),
    Appointment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const appt = await populate(Appointment.findById(req.params.id));
  if (!appt) throw new HttpError(404, 'Терминот не постои');
  if (!canModify(req.user, appt.patient?._id)) throw new HttpError(403, 'Ова не е ваш термин');
  const records = await Record.find({ appointment: appt._id }).sort({ tooth: 1 });
  res.json({ ...appt.toJSON(), records });
});

/** POST /api/appointments – a patient books a free slot (status "pending"). */
const create = asyncHandler(async (req, res) => {
  const [dentist, service] = await Promise.all([Dentist.findById(req.body.dentist), Service.findById(req.body.service)]);
  if (!dentist || !dentist.active) throw new HttpError(400, 'Стоматологот не постои или не прима пациенти', { dentist: 'невалиден' });
  if (!service || !service.active) throw new HttpError(400, 'Услугата не постои или не е достапна', { service: 'невалидна' });
  const start = new Date(req.body.start);
  const end = await assertBookable(dentist, service, start);

  // business rules for the patient
  const open = await Appointment.find({ patient: req.user._id, status: { $in: ACTIVE }, start: { $gte: new Date() } }).select('start end');
  if (open.length >= MAX_OPEN_PER_PATIENT) throw new HttpError(400, `Може да имате најмногу ${MAX_OPEN_PER_PATIENT} активни термини`);
  if (open.some((a) => a.start < end && start < a.end)) throw new HttpError(409, 'Веќе имате друг термин во тоа време');

  const appt = await Appointment.create({
    patient: req.user._id, dentist: dentist._id, service: service._id, start, end, price: service.price, note: req.body.note,
  });
  const patient = await User.findById(req.user._id);
  if (patient?.emailNotifications) sendMail({ to: patient.email, ...templates.booked(appt, service, dentist) });
  const admins = await User.find({ role: 'admin', emailNotifications: true }).select('email');
  admins.forEach((a) => sendMail({ to: a.email, ...templates.newBooking(appt, service, dentist, patient || req.user) }));
  logActivity(req.user, 'book', 'Appointment', appt._id, `Закажан термин: ${service.name}, ${fmt(start)}`);
  res.status(201).json(await populate(Appointment.findById(appt._id)));
});

/** PUT /api/appointments/:id/cancel – patient (until 24 h before) or admin */
const cancel = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate('service', 'name').populate('patient', 'email emailNotifications');
  if (!appt) throw new HttpError(404, 'Терминот не постои');
  if (!canModify(req.user, appt.patient?._id)) throw new HttpError(403, 'Ова не е ваш термин');
  if (!ACTIVE.includes(appt.status)) throw new HttpError(400, 'Може да се откаже само закажан или потврден термин');
  if (req.user.role !== 'admin' && appt.start.getTime() - Date.now() < CANCEL_BEFORE_MS) {
    throw new HttpError(400, 'Терминот може да се откаже најдоцна 24 часа однапред – јавете се во ординацијата');
  }
  appt.status = 'cancelled';
  appt.cancelReason = req.body.reason || (req.user.role === 'admin' ? 'Откажано од ординацијата' : 'Откажано од пациентот');
  await appt.save();
  if (appt.patient?.emailNotifications && String(appt.patient._id) !== String(req.user._id)) {
    sendMail({ to: appt.patient.email, ...templates.statusChanged(appt, appt.service, 'cancelled') });
  }
  logActivity(req.user, 'cancel', 'Appointment', appt._id, `Откажан термин: ${appt.service?.name}, ${fmt(appt.start)}`);
  res.json(await populate(Appointment.findById(appt._id)));
});

/**
 * PUT /api/appointments/:id/status (admin) { status, reason?, records? }
 * pending -> confirmed, pending/confirmed -> completed (adds entries to the dental record), -> cancelled
 */
const setStatus = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate('service', 'name').populate('patient', 'email emailNotifications');
  if (!appt) throw new HttpError(404, 'Терминот не постои');
  const { status } = req.body;
  const allowed = { pending: ['confirmed', 'completed', 'cancelled'], confirmed: ['completed', 'cancelled'], completed: [], cancelled: [] };
  if (!allowed[appt.status].includes(status)) throw new HttpError(400, `Термин со статус „${appt.status}“ не може да стане „${status}“`);
  if (status === 'completed' && appt.start > new Date()) throw new HttpError(400, 'Терминот не може да се заврши пред да започне');

  let records = [];
  if (status === 'completed' && Array.isArray(req.body.records)) {
    const docs = req.body.records.slice(0, 20).map((r) => ({
      patient: appt.patient._id, appointment: appt._id, dentist: appt.dentist, date: appt.start,
      tooth: r.tooth === '' || r.tooth == null ? null : Number(r.tooth), procedure: r.procedure, notes: r.notes,
    }));
    // validate all entries before changing anything
    await Promise.all(docs.map((d) => new Record(d).validate()));
    records = docs;
  }
  appt.status = status;
  if (status === 'cancelled') appt.cancelReason = req.body.reason || 'Откажано од ординацијата';
  await appt.save();
  if (records.length) await Record.insertMany(records);
  if (appt.patient?.emailNotifications) sendMail({ to: appt.patient.email, ...templates.statusChanged(appt, appt.service, status) });
  const action = { confirmed: 'confirm', completed: 'complete', cancelled: 'cancel' }[status];
  logActivity(req.user, action, 'Appointment', appt._id, `${appt.service?.name}, ${fmt(appt.start)} → ${status}${records.length ? ` (+${records.length} во картон)` : ''}`);
  res.json(await populate(Appointment.findById(appt._id)));
});

/** Admin – removes the appointment and its review (dental record entries stay in the history). */
const remove = asyncHandler(async (req, res) => {
  const appt = await Appointment.findByIdAndDelete(req.params.id);
  if (!appt) throw new HttpError(404, 'Терминот не постои');
  await Review.deleteMany({ appointment: appt._id });
  await Record.updateMany({ appointment: appt._id }, { $unset: { appointment: 1 } });
  logActivity(req.user, 'delete', 'Appointment', appt._id, `Избришан термин од ${fmt(appt.start)}`);
  res.status(204).end();
});

/** GET /api/appointments/export.csv – report generation (admin) */
const exportCsv = asyncHandler(async (req, res) => {
  const items = await populate(Appointment.find(buildFilter(req.query, req.user)).sort({ start: 1 }));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Датум и време', 'Пациент', 'Телефон', 'Стоматолог', 'Услуга', 'Траење (мин)', 'Цена (ден.)', 'Статус', 'Белешка'];
  const rows = items.map((a) => [
    fmt(a.start), a.patient?.fullName || a.patient?.username, a.patient?.phone,
    a.dentist ? `д-р ${a.dentist.firstName} ${a.dentist.lastName}` : '', a.service?.name, a.service?.durationMin, a.price, a.status, a.note,
  ].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="dentaplus-termini-${Date.now()}.csv"`);
  res.send(`﻿${header.map(esc).join(',')}\n${rows.join('\n')}`);
});

module.exports = { list, getOne, create, cancel, setStatus, remove, exportCsv };
