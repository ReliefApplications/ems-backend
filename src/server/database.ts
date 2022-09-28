import mongoose from 'mongoose';
import { Permission, Role, Channel, Setting } from '../models';
import config from 'config';
import { logger } from '../services/logger.service';

/**
 * Build the MongoDB url according to the environment parameters
 *
 * @returns The url to use for connecting to the MongoDB database
 */
const mongoDBUrl = (): string => {
  if (config.get('database.provider') === 'cosmosdb') {
    // Cosmos db
    return `${config.get('database.prefix')}://${config.get(
      'database.user'
    )}:${config.get('database.pass')}@${config.get(
      'database.host'
    )}:${config.get(
      'database.port'
    )}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${config.get(
      'database.name'
    )}@`;
  }
  if (config.get('database.prefix') === 'mongodb+srv') {
    // Mongo server
    return `${config.get('database.prefix')}://${config.get(
      'database.user'
    )}:${config.get('database.pass')}@${config.get(
      'database.host'
    )}/${config.get('database.name')}?retryWrites=true&w=majority`;
  } else {
    // Local mongo
    return `${config.get('database.prefix')}://${config.get(
      'database.user'
    )}:${config.get('database.pass')}@${config.get(
      'database.host'
    )}:${config.get('database.port')}/${config.get(
      'database.name'
    )}?authSource=admin&retrywrites=false&maxIdleTimeMS=120000`;
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
      'can_see_groups',
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
      logger.info(`${type} global permission created`);
    }
    const appPermissions = ['can_see_roles', 'can_see_users'];
    for (const type of appPermissions) {
      const permission = new Permission({
        type,
        global: false,
      });
      await permission.save();
      logger.info(`${type} application's permission created`);
    }

    // Create admin role and assign permissions
    const role = new Role({
      title: 'admin',
      permissions: await Permission.find().distinct('_id'),
    });
    await role.save();
    logger.info('admin role created');

    // Creates default channels.
    const channels = ['applications'];
    for (const title of channels) {
      const channel = new Channel({
        title,
      });
      await channel.save();
      logger.info(`${channel} channel created`);
    }

    // Create global settings document.
    const settings = new Setting({
      userManagement: {
        local: true,
      },
      modifiedAt: new Date(),
    });
    await settings.save();
    logger.info('Global settings created');
  } catch (err) {
    logger.error(err);
  }
};
