const Dentist = require('../models/dentist');
const Service = require('../models/service');
const Appointment = require('../models/appointment');
const Review = require('../models/review');
const { HttpError, asyncHandler, escapeRegex } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { daySlots, localDateStr } = require('../services/scheduling');
const { SPECIALTIES, PATTERNS } = require('../utils/patterns');

const FIELDS = ['firstName', 'lastName', 'specialty', 'bio', 'yearsExperience', 'photoUrl', 'workDays', 'startHour', 'endHour', 'active'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? undefined : body[k]]));

/** avgRating + reviewCount for every dentist (from the dependent Reviews collection) */
async function ratingsMap() {
  const rows = await Review.aggregate([{ $group: { _id: '$dentist', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { avgRating: Math.round(r.avg * 10) / 10, reviewCount: r.n }]));
}

/** GET /api/dentists?specialty=&q=&day=&all= */
const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.all !== 'true') filter.active = true;
  if (SPECIALTIES.includes(req.query.specialty)) filter.specialty = req.query.specialty;
  if (req.query.day && /^[1-6]$/.test(String(req.query.day))) filter.workDays = Number(req.query.day);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { bio: rx }];
  }
  const [dentists, ratings] = await Promise.all([Dentist.find(filter).sort({ lastName: 1 }), ratingsMap()]);
  let items = dentists.map((d) => ({ ...d.toJSON(), avgRating: null, reviewCount: 0, ...ratings[String(d._id)] }));
  if (req.query.minRating) items = items.filter((d) => (d.avgRating || 0) >= Number(req.query.minRating));
  res.json(items);
});

const getOne = asyncHandler(async (req, res) => {
  const dentist = await Dentist.findById(req.params.id);
  if (!dentist) throw new HttpError(404, 'Стоматологот не постои');
  const [ratings, distribution, upcoming, completed] = await Promise.all([
    ratingsMap(),
    Review.aggregate([{ $match: { dentist: dentist._id } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
    Appointment.countDocuments({ dentist: dentist._id, status: { $in: ['pending', 'confirmed'] }, start: { $gte: new Date() } }),
    Appointment.countDocuments({ dentist: dentist._id, status: 'completed' }),
  ]);
  const stars = [1, 2, 3, 4, 5].map((r) => distribution.find((d) => d._id === r)?.n || 0);
  res.json({ ...dentist.toJSON(), avgRating: null, reviewCount: 0, ...ratings[String(dentist._id)], ratingDistribution: stars, upcoming, completed });
});

/** GET /api/dentists/:id/slots?date=YYYY-MM-DD&service=ID – free and taken slots of one day */
const slots = asyncHandler(async (req, res) => {
  const { date, service: serviceId } = req.query;
  if (!PATTERNS.date.test(String(date || ''))) throw new HttpError(400, 'Невалиден датум (YYYY-MM-DD)', { date: 'невалиден' });
  if (!PATTERNS.objectId.test(String(serviceId || ''))) throw new HttpError(400, 'Изберете услуга', { service: 'задолжително' });
  const [dentist, service] = await Promise.all([Dentist.findById(req.params.id), Service.findById(serviceId)]);
  if (!dentist) throw new HttpError(404, 'Стоматологот не постои');
  if (!service) throw new HttpError(404, 'Услугата не постои');
  if (date < localDateStr(new Date())) return res.json({ date, closed: 'Датумот е во минатото', slots: [] });
  res.json(await daySlots(dentist, service, date));
});

const create = asyncHandler(async (req, res) => {
  const dentist = await Dentist.create(pick(req.body));
  logActivity(req.user, 'create', 'Dentist', dentist._id, `Додаден стоматолог д-р ${dentist.fullName}`);
  res.status(201).json(dentist);
});

const update = asyncHandler(async (req, res) => {
  const dentist = await Dentist.findById(req.params.id);
  if (!dentist) throw new HttpError(404, 'Стоматологот не постои');
  dentist.set(pick(req.body));
  await dentist.save();
  logActivity(req.user, 'update', 'Dentist', dentist._id, `Ажуриран стоматолог д-р ${dentist.fullName}`);
  res.json(dentist);
});

/** A dentist with upcoming appointments cannot be deleted (409) – deactivate instead. */
const remove = asyncHandler(async (req, res) => {
  const dentist = await Dentist.findById(req.params.id);
  if (!dentist) throw new HttpError(404, 'Стоматологот не постои');
  const upcoming = await Appointment.countDocuments({ dentist: dentist._id, status: { $in: ['pending', 'confirmed'] }, start: { $gte: new Date() } });
  if (upcoming > 0) throw new HttpError(409, `Стоматологот има ${upcoming} закажани термини – прво откажете ги или деактивирајте го`);
  await Promise.all([Review.deleteMany({ dentist: dentist._id }), dentist.deleteOne()]);
  logActivity(req.user, 'delete', 'Dentist', dentist._id, `Избришан стоматолог д-р ${dentist.fullName}`);
  res.status(204).end();
});

module.exports = { list, getOne, slots, create, update, remove };
