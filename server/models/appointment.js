const mongoose = require('mongoose');
const { APPOINTMENT_STATUSES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         patient: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         dentist: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Dentist' } ] }
 *         service: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Service' } ] }
 *         start: { type: string, format: date-time }
 *         end: { type: string, format: date-time, description: start + service duration }
 *         status: { type: string, enum: [pending, confirmed, completed, cancelled] }
 *         price: { type: integer, description: Price of the service at the moment of booking (MKD) }
 *         note: { type: string, description: Note from the patient }
 *         cancelReason: { type: string }
 *         hasReview: { type: boolean, description: computed }
 *     AppointmentInput:
 *       type: object
 *       required: [dentist, service, start]
 *       properties:
 *         dentist: { type: string, description: Dentist ObjectId }
 *         service: { type: string, description: Service ObjectId }
 *         start: { type: string, format: date-time, description: "A free slot from GET /dentists/{id}/slots" }
 *         note: { type: string, maxLength: 300, example: Ме боли долниот лев заб }
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist', required: [true, 'Изберете стоматолог'] },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: [true, 'Изберете услуга'] },
    start: { type: Date, required: [true, 'Изберете термин'] },
    end: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'pending' },
    price: { type: Number, min: 0 },
    note: { type: String, trim: true, maxlength: [300, 'Белешката може да има најмногу 300 знаци'] },
    cancelReason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

appointmentSchema.pre('validate', function times(next) {
  if (this.start && this.end && this.end <= this.start) this.invalidate('end', 'Крајот мора да е по почетокот');
  next();
});

appointmentSchema.virtual('review', { ref: 'Review', localField: '_id', foreignField: 'appointment', justOne: true });

appointmentSchema.index({ dentist: 1, start: 1 });
appointmentSchema.index({ patient: 1, start: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
