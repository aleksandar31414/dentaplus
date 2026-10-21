const mongoose = require('mongoose');
const { ACTIVITY_ACTIONS, ENTITY_TYPES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         action: { type: string, enum: [create, update, delete, login, register, book, cancel, confirm, complete, reply] }
 *         entityType: { type: string, enum: [User, Dentist, Service, Appointment, Review, Record, Database] }
 *         entityId: { type: string }
 *         description: { type: string, example: Booked Teeth whitening on 24.10.2026 10:00 }
 *         createdAt: { type: string, format: date-time }
 */
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    entityType: { type: String, enum: ENTITY_TYPES, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
