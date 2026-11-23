import mongoose from "mongoose";
import { serverEnv } from "./env";

/**
 * Cached Mongoose Connection Singleton
 * Prevents opening duplicate MongoDB connections during Next.js hot reloads
 * and serverless invocations.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri?: string;
}

declare global {
  var __jomaJatraMongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__jomaJatraMongooseCache ?? {
  conn: null,
  promise: null,
  uri: undefined,
};

if (!globalThis.__jomaJatraMongooseCache) {
  globalThis.__jomaJatraMongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  const targetUri = serverEnv.mongodbUri;

  // If MONGODB_URI changed (e.g. .env updated), reset the cached connection
  if (cached.conn && cached.uri && cached.uri !== targetUri) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.uri = targetUri;
    cached.promise = mongoose
      .connect(targetUri, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
