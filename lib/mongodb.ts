import mongoose, { Connection } from 'mongoose';

/**
 * Global cache for MongoDB connection.
 * Prevents multiple connections during development and server restarts.
 * In Next.js development mode, modules are re-evaluated on code changes,
 * which would create multiple database connections without this cache.
 */
const globalWithMongo = global as typeof globalThis & {
  mongoose?: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
  };
};

/**
 * Initializes MongoDB connection with Mongoose
 * @returns Promise<Connection> - The active Mongoose connection
 * @throws Error if MONGODB_URI is not defined
 */
async function connectToDatabase(): Promise<Connection> {
  // Return cached connection if available
  if (globalWithMongo.mongoose?.conn) {
    return globalWithMongo.mongoose.conn;
  }

  // Return pending promise if connection is already in progress
  if (globalWithMongo.mongoose?.promise) {
    return globalWithMongo.mongoose.promise;
  }

  // Validate MongoDB URI is set
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }
    
  // Initialize cache if needed
  if (!globalWithMongo.mongoose) {
    globalWithMongo.mongoose = { conn: null, promise: null };
  }

  // Create new connection promise
  const promise = mongoose
    .connect(mongodbUri, {
      // Buffering allows Mongoose to queue operations until connection is established
      bufferCommands: true,
      // Maximum time to retry initial connection
      serverSelectionTimeoutMS: 5000,
    })
    .then((mongooseInstance) => {
      // Return the connection object from the instance
      return mongooseInstance.connection;
    })
    .catch((error) => {
      // Clean up cache on connection failure
      if (globalWithMongo.mongoose) {
        globalWithMongo.mongoose.promise = null;
      }
      throw error;
    });
    
  globalWithMongo.mongoose.promise = promise;

  // Wait for connection and cache the result
  const conn = await promise;
  globalWithMongo.mongoose.conn = conn;

  return conn;
}

export default connectToDatabase;
