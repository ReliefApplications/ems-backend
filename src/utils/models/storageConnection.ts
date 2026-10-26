import mongoose, { Connection } from 'mongoose';

/** Format of the storage database names */
export const STORAGE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,63}$/;

/**
 * Gets the connection to a storage database: another database of the same
 * cluster, holding the records and versions of some forms. The connection
 * shares the pool of the main connection, and is cached by database name.
 *
 * @param storage Name of the storage database
 * @returns Connection to the storage database
 */
export const getStorageConnection = (storage: string): Connection => {
  if (!STORAGE_NAME_REGEX.test(storage)) {
    throw new Error(`Invalid storage database name: ${storage}`);
  }
  if (storage === mongoose.connection.name) {
    throw new Error(
      `The storage database cannot be the main database (${storage})`
    );
  }
  return mongoose.connection.useDb(storage, { useCache: true });
};

/**
 * Gets the storage database of a model: the name of its database when it is
 * not the main one.
 *
 * @param model Mongoose model, or anything with a connection in `db`
 * @param model.db Connection of the model
 * @returns Name of the storage database, undefined for the main database
 */
export const getModelStorage = (model: {
  db?: Connection;
}): string | undefined => {
  const connection = model?.db;
  return connection && connection !== mongoose.connection
    ? connection.name
    : undefined;
};
