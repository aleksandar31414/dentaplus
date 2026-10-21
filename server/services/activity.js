const Activity = require('../models/activity');

/** Stores an entry in the activity history. Never throws. */
async function logActivity(user, action, entityType, entityId, description) {
  try {
    await Activity.create({ user: user?._id, action, entityType, entityId, description });
  } catch (err) {
    console.error('[activity] failed:', err.message);
  }
}

module.exports = { logActivity };
