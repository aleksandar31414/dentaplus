const Service = require('../models/service');
const Appointment = require('../models/appointment');
const { HttpError, asyncHandler, escapeRegex } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { CATEGORIES } = require('../utils/patterns');

const FIELDS = ['name', 'category', 'description', 'price', 'durationMin', 'active'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const SORTS = { name: { name: 1 }, price: { price: 1 }, '-price': { price: -1 }, duration: { durationMin: 1 }, popular: null };

/** GET /api/services?q=&category=&minPrice=&maxPrice=&maxDuration=&sort= */
const list = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, maxDuration, sort, all } = req.query;
  const filter = {};
  if (all !== 'true') filter.active = true;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  if (category) {
    const cats = String(category).split(',').filter((c) => CATEGORIES.includes(c));
    if (cats.length) filter.category = { $in: cats };
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (maxDuration) filter.durationMin = { $lte: Number(maxDuration) };

  const services = await Service.find(filter).sort(SORTS[sort] || SORTS.name);
  // popularity = number of bookings (from the dependent Appointments collection)
  const counts = await Appointment.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: '$service', n: { $sum: 1 } } }]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  let items = services.map((s) => ({ ...s.toJSON(), bookings: byId[String(s._id)] || 0 }));
  if (sort === 'popular') items = items.sort((a, b) => b.bookings - a.bookings);
  res.json(items);
});

const getOne = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new HttpError(404, 'Услугата не постои');
  const bookings = await Appointment.countDocuments({ service: service._id, status: { $ne: 'cancelled' } });
  res.json({ ...service.toJSON(), bookings });
});

const create = asyncHandler(async (req, res) => {
  const service = await Service.create(pick(req.body));
  logActivity(req.user, 'create', 'Service', service._id, `Додадена услуга ${service.name}`);
  res.status(201).json(service);
});

const update = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new HttpError(404, 'Услугата не постои');
  service.set(pick(req.body));
  await service.save();
  logActivity(req.user, 'update', 'Service', service._id, `Ажурирана услуга ${service.name}`);
  res.json(service);
});

/** A service used by appointments cannot be deleted (409) – it can be deactivated. */
const remove = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new HttpError(404, 'Услугата не постои');
  const used = await Appointment.countDocuments({ service: service._id });
  if (used > 0) throw new HttpError(409, `Услугата е користена во ${used} термини – деактивирајте ја наместо да ја бришете`);
  await service.deleteOne();
  logActivity(req.user, 'delete', 'Service', service._id, `Избришана услуга ${service.name}`);
  res.status(204).end();
});

module.exports = { list, getOne, create, update, remove };
