const User = require('../models/user');
const Appointment = require('../models/appointment');
const Review = require('../models/review');
const Record = require('../models/record');
const { HttpError, asyncHandler } = require('../utils/http');
const { logActivity } = require('../services/activity');

const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const counts = await Appointment.aggregate([
    { $group: { _id: '$patient', n: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(users.map((u) => ({
    ...u.toJSON(),
    appointmentCount: byUser[String(u._id)]?.n || 0,
    completedCount: byUser[String(u._id)]?.done || 0,
  })));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  res.json(user);
});

/** Admin: any field incl. role. User: only own fullName/country/emailNotifications. */
const update = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && req.user._id !== req.params.id) throw new HttpError(403, 'Може да го менувате само својот профил');
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');

  const allowed = ['fullName', 'phone', 'emailNotifications', ...(isAdmin ? ['role'] : [])];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) user[k] = req.body[k];
  });
  if (isAdmin && req.body.role && req.user._id === req.params.id && req.body.role !== 'admin') {
    throw new HttpError(400, 'Администраторот не може сам да си ја одземе улогата');
  }
  await user.save();
  logActivity(req.user, 'update', 'User', user._id, `Ажуриран корисник ${user.username}`);
  res.json(user);
});

const remove = asyncHandler(async (req, res) => {
  if (req.user._id === req.params.id) throw new HttpError(400, 'Не може да се избришете самите себе');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  // cascade: the patient's appointments, reviews and dental record
  await Promise.all([
    Appointment.deleteMany({ patient: user._id }),
    Review.deleteMany({ patient: user._id }),
    Record.deleteMany({ patient: user._id }),
  ]);
  logActivity(req.user, 'delete', 'User', user._id, `Избришан корисник ${user.username}`);
  res.status(204).end();
});

module.exports = { list, getOne, update, remove };
