const Review = require('../models/review');
const Appointment = require('../models/appointment');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');
const { PATTERNS } = require('../utils/patterns');

const populate = (q) => q.populate('patient', 'username fullName').populate('dentist', 'firstName lastName specialty');

/** Public list (e.g. on a dentist's page). ?dentist=&mine=true&minRating= */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 10);
  const filter = {};
  if (req.query.dentist && PATTERNS.objectId.test(req.query.dentist)) filter.dentist = req.query.dentist;
  if (req.query.mine === 'true') {
    if (!req.user) throw new HttpError(401, 'Потребна е најава');
    filter.patient = req.user._id;
  }
  if (req.query.minRating) filter.rating = { $gte: Number(req.query.minRating) };
  const [items, total] = await Promise.all([
    populate(Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

/** Only the patient of a COMPLETED appointment can review it, once. */
const create = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.body.appointment);
  if (!appt) throw new HttpError(400, 'Терминот не постои', { appointment: 'не постои' });
  if (String(appt.patient) !== String(req.user._id)) throw new HttpError(403, 'Може да оцените само свој термин');
  if (appt.status !== 'completed') throw new HttpError(400, 'Рецензија може да се остави само по завршен термин');
  if (await Review.exists({ appointment: appt._id })) throw new HttpError(409, 'Веќе оставивте рецензија за овој термин');
  const review = await Review.create({ patient: req.user._id, dentist: appt.dentist, appointment: appt._id, rating: req.body.rating, text: req.body.text });
  logActivity(req.user, 'create', 'Review', review._id, `Рецензија ${'★'.repeat(review.rating)}`);
  res.status(201).json(await populate(Review.findById(review._id)));
});

const update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new HttpError(404, 'Рецензијата не постои');
  if (String(review.patient) !== String(req.user._id)) throw new HttpError(403, 'Може да ги менувате само своите рецензии');
  ['rating', 'text'].forEach((k) => { if (req.body[k] !== undefined) review[k] = req.body[k]; });
  await review.save();
  logActivity(req.user, 'update', 'Review', review._id, 'Изменета рецензија');
  res.json(await populate(Review.findById(review._id)));
});

const remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new HttpError(404, 'Рецензијата не постои');
  if (!canModify(req.user, review.patient)) throw new HttpError(403, 'Може да ги бришете само своите рецензии');
  await review.deleteOne();
  logActivity(req.user, 'delete', 'Review', review._id, 'Избришана рецензија');
  res.status(204).end();
});

/** PUT /api/reviews/:id/reply (admin) – the clinic answers a review; the patient gets an e-mail. */
const reply = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate('patient', 'email emailNotifications');
  if (!review) throw new HttpError(404, 'Рецензијата не постои');
  review.reply = req.body.reply;
  review.replyAt = new Date();
  await review.save();
  if (review.patient?.emailNotifications) sendMail({ to: review.patient.email, ...templates.reviewReply(review) });
  logActivity(req.user, 'reply', 'Review', review._id, 'Одговор на рецензија');
  res.json(await populate(Review.findById(review._id)));
});

module.exports = { list, create, update, remove, reply };
