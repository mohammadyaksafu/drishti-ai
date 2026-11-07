const mongoose = require('mongoose');

// Vercel serverless invocations reuse the same container, so we cache the
// connection promise on the module scope to avoid opening a new pool per request.
let cached = global.__drishtiMongoose;
if (!cached) cached = global.__drishtiMongoose = { conn: null, promise: null };

/**
 * The database named in the URI path wins. A URI without one would make the
 * driver fall back to "test" while the ML worker polls "drishti_ai", so the two
 * would silently drift apart — use MONGODB_DB (default drishti_ai) instead,
 * the same rule as ml-backend/db.py.
 */
function databaseName(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri || '');
  const fromUri = match && decodeURIComponent(match[1]).trim();
  return fromUri || (process.env.MONGODB_DB || 'drishti_ai').trim();
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
        dbName: databaseName(process.env.MONGODB_URI),
      })
      .then((m) => {
        console.log(`[db] MongoDB connected: ${m.connection.host}/${m.connection.name}`);
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
