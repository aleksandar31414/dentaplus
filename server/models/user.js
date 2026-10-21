const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PATTERNS, ROLES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 66f1a2b3c4d5e6f708192a3b }
 *         username: { type: string, example: marija.s }
 *         email: { type: string, format: email, example: marija@dentaplus.mk }
 *         fullName: { type: string, example: Marija Stojanova }
 *         phone: { type: string, example: '+389 70 123 456' }
 *         role: { type: string, enum: [user, admin] }
 *         emailNotifications: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Корисничкото име е задолжително'],
      unique: true,
      trim: true,
      match: [PATTERNS.username, 'Корисничкото име: 3–20 знаци (букви, бројки, . и _)'],
    },
    email: {
      type: String,
      required: [true, 'Е-поштата е задолжителна'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [PATTERNS.email, 'Невалидна е-пошта'],
    },
    fullName: { type: String, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, match: [PATTERNS.phone, 'Невалиден телефонски број'] },
    role: { type: String, enum: ROLES, default: 'user' },
    emailNotifications: { type: Boolean, default: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.validPassword = function validPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.generateJwt = function generateJwt() {
  return jwt.sign(
    { _id: this._id, username: this.username, email: this.email, role: this.role },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
