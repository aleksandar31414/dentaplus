const Activity = require('../models/activity');
const { asyncHandler, pagination } = require('../utils/http');
const { ACTIVITY_ACTIONS, ENTITY_TYPES, PATTERNS } = require('../utils/patterns');

/** Users see their own history, admins see everybody's (optionally filtered by ?user=). */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 25);
  const filter = {};
  if (req.user.role !== 'admin') filter.user = req.user._id;
  else if (req.query.user && PATTERNS.objectId.test(req.query.user)) filter.user = req.query.user;
  if (ACTIVITY_ACTIONS.includes(req.query.action)) filter.action = req.query.action;
  if (ENTITY_TYPES.includes(req.query.entityType)) filter.entityType = req.query.entityType;

  const [items, total] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'username role'),
    Activity.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

module.exports = { list };
