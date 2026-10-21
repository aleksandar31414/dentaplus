const Dentist = require('../models/dentist');
const Service = require('../models/service');
const Appointment = require('../models/appointment');
const Review = require('../models/review');
const User = require('../models/user');
const { asyncHandler } = require('../utils/http');

const notCancelled = { $match: { status: { $ne: 'cancelled' } } };
const lastYear = () => { const d = new Date(); d.setMonth(d.getMonth() - 11, 1); d.setHours(0, 0, 0, 0); return d; };

/** GET /api/stats/overview – numbers for the home page and the charts dashboard */
const overview = asyncHandler(async (_req, res) => {
  const now = new Date();
  const [dentists, services, patients, appointments, upcoming, completed, avg,
    byMonth, byService, byDentist, byStatus, byCategory, ratingByDentist, latestReviews, busiestHours] = await Promise.all([
    Dentist.countDocuments({ active: true }),
    Service.countDocuments({ active: true }),
    User.countDocuments({ role: 'user' }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: { $in: ['pending', 'confirmed'] }, start: { $gte: now } }),
    Appointment.countDocuments({ status: 'completed' }),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $match: { start: { $gte: lastYear() } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$start', timezone: process.env.TZ || 'Europe/Skopje' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      notCancelled,
      { $group: { _id: '$service', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 's' } },
      { $unwind: '$s' },
      { $project: { n: 1, name: '$s.name', price: '$s.price' } },
    ]),
    Appointment.aggregate([
      notCancelled,
      { $group: { _id: '$dentist', n: { $sum: 1 } } },
      { $lookup: { from: 'dentists', localField: '_id', foreignField: '_id', as: 'd' } },
      { $unwind: '$d' },
      { $project: { n: 1, name: { $concat: ['д-р ', '$d.firstName', ' ', '$d.lastName'] } } },
      { $sort: { n: -1 } },
    ]),
    Appointment.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Appointment.aggregate([
      notCancelled,
      { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 's' } },
      { $unwind: '$s' },
      { $group: { _id: '$s.category', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    Review.aggregate([
      { $group: { _id: '$dentist', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
      { $lookup: { from: 'dentists', localField: '_id', foreignField: '_id', as: 'd' } },
      { $unwind: '$d' },
      { $project: { n: 1, avg: { $round: ['$avg', 1] }, name: { $concat: ['$d.firstName', ' ', '$d.lastName'] } } },
      { $sort: { avg: -1 } },
    ]),
    Review.find({ rating: { $gte: 4 } }).sort({ createdAt: -1 }).limit(3)
      .populate('patient', 'fullName username').populate('dentist', 'firstName lastName'),
    Appointment.aggregate([
      notCancelled,
      { $group: { _id: { $hour: { date: '$start', timezone: process.env.TZ || 'Europe/Skopje' } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    counts: {
      dentists, services, patients, appointments, upcoming, completed,
      avgRating: avg[0] ? Math.round(avg[0].avg * 10) / 10 : null, reviews: avg[0]?.n || 0,
    },
    byMonth, byService, byDentist, byStatus, byCategory, ratingByDentist, latestReviews, busiestHours,
  });
});

module.exports = { overview };
