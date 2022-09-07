import mongoose from 'mongoose';
import { Permission, Role, Channel } from '../models';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Build the MongoDB url according to the environment parameters
 *
 * @returns The url to use for connecting to the MongoDB database
 */
const mongoDBUrl = (): string => {
  if (process.env.DB_PROVIDER === 'cosmosdb') {
    // Cosmos db
    return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.DB_NAME}@`;
  }
  if (process.env.DB_PREFIX === 'mongodb+srv') {
    // Mongo server
    return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
  } else {
    // Local mongo
    return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.DB_NAME}@`;
  }
};

/**
 * Starts the database connection
 *
 * @param options mongo connect options
 */
export const startDatabase = async (options?: any) => {
  await mongoose.connect(mongoDBUrl(), {
    useCreateIndex: true,
    useNewUrlParser: true,
    autoIndex: true,
    useUnifiedTopology: true,
    ...options,
  });
};

/** Closes the database connection */
export const stopDatabase = async () => {
  await mongoose.disconnect();
};

/**
 * Initialize the database with default permissions, admin role and channels
 */
export const initDatabase = async () => {
  try {
    // Create default permissions
    const globalPermissions = [
      'can_see_roles',
      'can_see_forms',
      'can_see_resources',
      'can_see_users',
      'can_see_applications',
      'can_manage_forms',
      'can_create_forms',
      'can_create_resources',
      'can_manage_resources',
      'can_manage_applications',
      'can_manage_api_configurations',
      'can_create_applications',
    ];
    for (const type of globalPermissions) {
      const permission = new Permission({
        type,
        global: true,
      });
      await permission.save();
      console.log(`${type} global permission created`);
    }
    const appPermissions = ['can_see_roles', 'can_see_users'];
    for (const type of appPermissions) {
      const permission = new Permission({
        type,
        global: false,
      });
      await permission.save();
      console.log(`${type} application's permission created`);
    }

    // Create admin role and assign permissions
    const role = new Role({
      title: 'admin',
      permissions: await Permission.find().distinct('_id'),
    });
    await role.save();
    console.log('admin role created');

    // Creates default channels.
    const channels = ['applications'];
    for (const title of channels) {
      const channel = new Channel({
        title,
      });
      await channel.save();
      console.log(`${channel} channel created`);
    }
  } catch (err) {
    console.log(err);
  }
};
