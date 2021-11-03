import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const mongoDBUrl = (): string => {
  if (process.env.COSMOS_DB_PREFIX) {
    return `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`;
  } else {
    if (process.env.DB_PREFIX === 'mongodb+srv') {
      return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    } else {
      return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`;
    }
  }
};

export const startDatabase = async () => {
  await mongoose.connect(mongoDBUrl(), {
    useCreateIndex: true,
    useNewUrlParser: true,
    autoIndex: true,
  });
};

export const stopDatabase = async () => {
  await mongoose.disconnect();
};
