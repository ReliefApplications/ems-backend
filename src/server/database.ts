import mongoose from 'mongoose';
import { Permission, Role, Channel } from '@models';
import config from 'config';
import logger from '@lib/logger';

/**
 * Build the MongoDB url according to the environment parameters
 *
 * @returns The url to use for connecting to the MongoDB database
 */
const mongoDBUrl = (): string => {
  switch (config.get('database.provider')) {
    case 'cosmosdb': {
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
    case 'mongodb+srv': {
      // Mongo server
      return `${config.get('database.prefix')}://${config.get(
        'database.user'
      )}:${config.get('database.pass')}@${config.get(
        'database.host'
      )}/${config.get('database.name')}?retryWrites=true&w=majority`;
    }
    case 'mongodb': {
      // Local Mongo
      return `${config.get('database.prefix')}://${config.get(
        'database.user'
      )}:${config.get('database.pass')}@${config.get(
        'database.host'
      )}:${config.get('database.port')}/${config.get(
        'database.name'
      )}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${config.get(
        'database.name'
      )}@`;
    }
    case 'docker': {
      // Docker compose
      return `${config.get('database.prefix')}://${config.get(
        'database.user'
      )}:${config.get('database.pass')}@${config.get(
        'database.host'
      )}:${config.get('database.port')}/${config.get(
        'database.name'
      )}?authSource=admin&retrywrites=false&maxIdleTimeMS=120000`;
    }
  }
};

/**
 * Starts the database connection
 *
 * @param options mongo connect options
 */
export const startDatabase = async (options?: any) => {
  await mongoose.connect(mongoDBUrl(), {
    autoIndex: true,
    ...options,
    ...(config.get('database.sslCA') && {
      ssl: true,
      sslValidate: true,
      sslCA: config.get('database.sslCA'),
    }),
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
      'can_delete_applications',
      'can_manage_api_configurations',
      'can_create_applications',
      'can_manage_layer',
      'can_see_layer',
    ];
    const currPermissions = await Permission.find();
    for (const type of globalPermissions.filter(
      (perm) => !currPermissions.find((p) => p.type === perm && p.global)
    )) {
      const permission = new Permission({
        type,
        global: true,
      });
      await permission.save();
      logger.info(`${type} global permission created`);
    }
    const appPermissions = [
      'can_see_roles',
      'can_see_layer',
      'can_see_users',
      'can_manage_templates',
      'can_manage_distribution_lists',
      'can_manage_custom_notifications',
    ];
    for (const type of appPermissions.filter(
      (perm) => !currPermissions.find((p) => p.type === perm && !p.global)
    )) {
      const permission = new Permission({
        type,
        global: false,
      });
      await permission.save();
      logger.info(`${type} application's permission created`);
    }

    const hasAdminRole = !!(await Role.findOne({ title: 'admin' }));
    if (!hasAdminRole) {
      // Create admin role and assign permissions
      const role = new Role({
        title: 'admin',
        permissions: await Permission.find().distinct('_id'),
      });
      await role.save();
      logger.info('admin role created');
    }

    const currChannels = await Channel.find();
    // Creates default channels.
    const channels = ['applications'];
    for (const title of channels.filter(
      (c) => !currChannels.find((ch) => ch.title === c)
    )) {
      const channel = new Channel({
        title,
      });
      await channel.save();
      logger.info(`${channel} channel created`);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
  }
};
