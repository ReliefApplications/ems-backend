import mongoose from 'mongoose';
import { Permission, Role, Channel } from '../models';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Build the MongoDB url according to the environment parameters
 * @returns The url to use for connecting to the MongoDB database
 */
const mongoDBUrl = (): string => {
  if (process.env.CI) {
    return `${process.env.DB_PREFIX}://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  }
  if (process.env.COSMOS_DB_PREFIX) {
    return `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`;
  }
  if (process.env.DB_PREFIX === 'mongodb+srv') {
    return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
  } else {
    return `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`;
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
