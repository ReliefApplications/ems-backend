import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Use to create database connection.
 *
 * @returns database connection
 */
export const startDatabase = async () => {
  const mongoUrl = `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
  await mongoose.connect(mongoUrl, {
    useCreateIndex: true,
    useNewUrlParser: true,
    autoIndex: true,
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
  });
};
