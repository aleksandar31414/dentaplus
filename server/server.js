require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const app = require('./app');
const { connectDb } = require('./config/db');
const { seedDatabase } = require('./seed/seed');
const Dentist = require('./models/dentist');

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDb();
  if (process.env.SEED_ON_START === 'true' && (await Dentist.estimatedDocumentCount()) === 0) {
    console.log('[seed] Empty database – inserting initial data', await seedDatabase());
  }
  app.listen(PORT, () => {
    console.log(`DentaPlus running on http://localhost:${PORT}`);
    console.log(`API docs: http://localhost:${PORT}/api/docs`);
  });
})().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
