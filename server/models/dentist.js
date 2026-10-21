const mongoose = require('mongoose');
const { PATTERNS, SPECIALTIES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Dentist:
 *       type: object
 *       required: [firstName, lastName, specialty]
 *       properties:
 *         _id: { type: string }
 *         firstName: { type: string, example: Elena }
 *         lastName: { type: string, example: Nikolovska }
 *         specialty: { type: string, enum: [general, orthodontics, surgery, endodontics, pediatric, prosthetics, periodontics] }
 *         bio: { type: string }
 *         yearsExperience: { type: integer, minimum: 0, maximum: 50, example: 12 }
 *         photoUrl: { type: string, format: uri }
 *         workDays: { type: array, items: { type: integer, minimum: 1, maximum: 6 }, example: [1, 2, 3, 4, 5], description: "1 = Monday … 6 = Saturday" }
 *         startHour: { type: integer, minimum: 7, maximum: 14, example: 8 }
 *         endHour: { type: integer, minimum: 12, maximum: 21, example: 16 }
 *         active: { type: boolean }
 *         avgRating: { type: number, description: computed from reviews }
 *         reviewCount: { type: integer, description: computed }
 */
const dentistSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'Името е задолжително'], trim: true, match: [PATTERNS.personName, 'Невалидно име'] },
    lastName: { type: String, required: [true, 'Презимето е задолжително'], trim: true, match: [PATTERNS.personName, 'Невалидно презиме'] },
    specialty: { type: String, required: [true, 'Специјалноста е задолжителна'], enum: { values: SPECIALTIES, message: 'Непозната специјалност: {VALUE}' } },
    bio: { type: String, trim: true, maxlength: [1000, 'Биографијата може да има најмногу 1000 знаци'] },
    yearsExperience: { type: Number, min: [0, 'Искуство од 0 до 50 години'], max: [50, 'Искуство од 0 до 50 години'], default: 0 },
    photoUrl: { type: String, trim: true, match: [PATTERNS.url, 'Невалиден URL'] },
    workDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: [
        { validator: (v) => v.length > 0, message: 'Изберете барем еден работен ден' },
        { validator: (v) => v.every((d) => Number.isInteger(d) && d >= 1 && d <= 6), message: 'Работните денови се од 1 (понеделник) до 6 (сабота)' },
      ],
    },
    startHour: { type: Number, min: 7, max: 14, default: 8 },
    endHour: { type: Number, min: 12, max: 21, default: 16 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

dentistSchema.pre('validate', function hours(next) {
  if (this.endHour - this.startHour < 3) this.invalidate('endHour', 'Работното време мора да е барем 3 часа');
  next();
});

dentistSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Dentist', dentistSchema);
