const mongoose = require('mongoose');
const { TEETH } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Record:
 *       type: object
 *       description: One entry in the patient's dental record (created by the clinic when an appointment is completed)
 *       properties:
 *         _id: { type: string }
 *         patient: { type: string }
 *         appointment: { type: string }
 *         dentist: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Dentist' } ] }
 *         tooth: { type: integer, nullable: true, example: 36, description: "FDI number 11–48, empty for the whole mouth" }
 *         procedure: { type: string, example: Composite filling }
 *         notes: { type: string }
 *         date: { type: string, format: date-time }
 *     RecordInput:
 *       type: object
 *       required: [procedure]
 *       properties:
 *         tooth: { type: integer, example: 36 }
 *         procedure: { type: string, example: Composite filling }
 *         notes: { type: string }
 */
const recordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    dentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist' },
    tooth: { type: Number, default: null, validate: { validator: (v) => v == null || TEETH.includes(v), message: 'Непознат заб: {VALUE} (FDI 11–48)' } },
    procedure: { type: String, required: [true, 'Внесете интервенција'], trim: true, minlength: 2, maxlength: 80 },
    notes: { type: String, trim: true, maxlength: 500 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Record', recordSchema);
