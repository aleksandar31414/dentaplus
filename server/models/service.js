const mongoose = require('mongoose');
const { PATTERNS, CATEGORIES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       required: [name, category, price, durationMin]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: Teeth whitening }
 *         category: { type: string, enum: [preventive, restorative, cosmetic, surgery, orthodontics, pediatric] }
 *         description: { type: string }
 *         price: { type: integer, minimum: 0, maximum: 200000, example: 6000, description: Price in MKD }
 *         durationMin: { type: integer, enum: [15, 30, 45, 60, 75, 90, 120], example: 60 }
 *         active: { type: boolean }
 */
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Името е задолжително'], unique: true, trim: true, match: [PATTERNS.serviceName, 'Невалидно име на услуга'] },
    category: { type: String, required: [true, 'Категоријата е задолжителна'], enum: { values: CATEGORIES, message: 'Непозната категорија: {VALUE}' } },
    description: { type: String, trim: true, maxlength: [800, 'Описот може да има најмногу 800 знаци'] },
    price: {
      type: Number,
      required: [true, 'Цената е задолжителна'],
      min: [0, 'Цената не може да е негативна'],
      max: [200000, 'Цената е најмногу 200.000 ден.'],
      validate: { validator: Number.isInteger, message: 'Цената мора да е цел број' },
    },
    durationMin: {
      type: Number,
      required: [true, 'Траењето е задолжително'],
      enum: { values: [15, 30, 45, 60, 75, 90, 120], message: 'Траење: 15, 30, 45, 60, 75, 90 или 120 минути' },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
