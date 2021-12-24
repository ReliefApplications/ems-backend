import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { initDatabase } from '../server/database';
dotenv.config();

/**
 * Initialize the database
 */
// eslint-disable-next-line no-undef
if (process.env.COSMOS_DB_PREFIX) {
  mongoose.connect(
    `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`, {
      useCreateIndex: true,
      useNewUrlParser: true,
      autoIndex: true,
    });
} else {
  if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`, {
        useCreateIndex: true,
        useNewUrlParser: true,
        autoIndex: true,
      });
  } else {
    mongoose.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`);
  }
}
mongoose.connection.once('open', async () => {
  await initDatabase();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
