import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Jest globalSetup: boot a single MongoMemoryServer for the whole test run.
 * Worker processes pick the URI up from process.env.MONGO_URI.
 * The instance is also stashed on global so globalTeardown can stop it.
 */
module.exports = async () => {
  const server = await MongoMemoryServer.create();
  process.env.MONGO_URI = server.getUri();
  (global as any).__MONGO_SERVER__ = server;
};
