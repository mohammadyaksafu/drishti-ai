const mongoose = require('mongoose');

// Vercel serverless invocations reuse the same container, so we cache the
// connection promise on the module scope to avoid opening a new pool per request.
let cached = global.__drishtiMongoose;
if (!cached) cached = global.__drishtiMongoose = { conn: null, promise: null };

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
