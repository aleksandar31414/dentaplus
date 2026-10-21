const { seedDatabase, clearDatabase } = require('../seed/seed');
const { asyncHandler } = require('../utils/http');
const mongoose = require('mongoose');

const status = asyncHandler(async (_req, res) => {
  const names = ['users', 'dentists', 'services', 'appointments', 'reviews', 'records', 'activities'];
  const counts = {};
  for (const n of names) counts[n] = await mongoose.connection.db.collection(n).countDocuments();
  res.json({ database: mongoose.connection.name, host: mongoose.connection.host, counts });
});

const clear = asyncHandler(async (_req, res) => {
  const deleted = await clearDatabase();
  res.json({ message: 'Сите податоци се избришани', deleted });
});

const seed = asyncHandler(async (_req, res) => {
  const inserted = await seedDatabase();
  res.status(201).json({ message: 'Иницијалните податоци се внесени', inserted });
});

module.exports = { status, clear, seed };
