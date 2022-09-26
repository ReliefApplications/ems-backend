import dotenv from 'dotenv';
dotenv.config();
import { startDatabase } from '../../server/database';

/**
 * Use to create database connection.
 *
 * @returns database connection
 */
export const startDatabaseForImport = async () => {
  await startDatabase({
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
  });
};
