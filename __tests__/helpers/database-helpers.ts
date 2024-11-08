import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Database helpers for tests.
 */
export class DatabaseHelpers {
  private server: MongoMemoryServer;

  /**
   * Connect to the database
   */
  public async connect() {
    this.server = await MongoMemoryServer.create();
    const uri = this.server.getUri();

    await mongoose.connect(uri);
  }

  /**
   * Disconnect from the database.
   */
  public async disconnect() {
    await mongoose.disconnect();
    await this.server.stop();
  }
}
