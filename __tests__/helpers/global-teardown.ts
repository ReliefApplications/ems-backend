import type { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Jest globalTeardown: stop the shared MongoMemoryServer started in globalSetup.
 */
module.exports = async () => {
  const server: MongoMemoryServer | undefined = (global as any)
    .__MONGO_SERVER__;
  if (server) await server.stop();
};
