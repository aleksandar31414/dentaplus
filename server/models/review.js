const mongoose = require('mongoose');

/**
 * @openapi
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         patient: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         dentist: { type: string }
 *         appointment: { type: string }
 *         rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *         text: { type: string, example: Многу љубезна и безболна интервенција. }
 *         reply: { type: string, description: Answer from the clinic (admin) }
 *         replyAt: { type: string, format: date-time }
 */
const reviewSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    rating: {
      type: Number,
      required: [true, 'Оценката е задолжителна'],
      min: [1, 'Оценка од 1 до 5'],
      max: [5, 'Оценка од 1 до 5'],
      validate: { validator: Number.isInteger, message: 'Оценката мора да е цел број' },
    },
    text: {
      type: String,
      required: [true, 'Напишете коментар'],
      trim: true,
      minlength: [10, 'Коментарот мора да има најмалку 10 знаци'],
      maxlength: [500, 'Коментарот може да има најмногу 500 знаци'],
    },
    reply: { type: String, trim: true, maxlength: [500, 'Одговорот може да има најмногу 500 знаци'] },
    replyAt: { type: Date },
  },
  { timestamps: true }
);

reviewSchema.index({ dentist: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
