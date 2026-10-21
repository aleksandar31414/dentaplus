const mongoose = require('mongoose');

/**
 * Local (Docker / own computer) -> MONGODB_URI (default: local mongod)
 * Production (cloud, NODE_ENV=production) -> MONGODB_ATLAS_URI (MongoDB Atlas)
 */
function resolveMongoUri() {
  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_ATLAS_URI) {
    return process.env.MONGODB_ATLAS_URI;
  }
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dentaplus';
}

async function connectDb(retries = 10) {
  const uri = resolveMongoUri();
  const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(`[db] Connected to ${safeUri}`);
      return mongoose.connection;
    } catch (err) {
      console.error(`[db] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

mongoose.connection.on('disconnected', () => console.log('[db] Disconnected'));

module.exports = { connectDb, resolveMongoUri };
