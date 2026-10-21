// CLI: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const { seedDatabase } = require('./seed');

(async () => {
  await connectDb(3);
  console.log(await seedDatabase());
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
