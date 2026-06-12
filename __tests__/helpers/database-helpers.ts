import mongoose from 'mongoose';

/**
 * Per-suite mongoose connection helper. The MongoMemoryServer itself is started
 * once by global-setup.ts and exposed via process.env.MONGO_URI — each suite
 * just connects to a unique database name on that shared server, so suites
 * remain isolated without paying the server-startup cost every time.
 */
export class DatabaseHelpers {
  /**
   * Connect mongoose to a fresh database on the shared in-memory server.
   */
  public async connect() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error(
        'MONGO_URI is not set — is globalSetup wired up in jest.config.js?'
      );
    }
    const dbName = `test_${
      process.env.JEST_WORKER_ID ?? 'main'
    }_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await mongoose.connect(uri, { dbName });
    await mongoose.connection.syncIndexes();
  }

  /**
   * Drop the suite's database and disconnect mongoose. The shared server keeps running.
   */
  public async disconnect() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}
