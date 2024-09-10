import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Role, Channel } from '@models';
import { logger } from '../src/lib/logger';

/** Create channel to each role that doesn't have a channel yet */
const createChannel = async () => {
  try {
    // Gets all existing channels linked to a role
    const existingRoleChannels = await Channel.find({
      role: { $exists: true, $ne: null },
    });
    const existingRoleIds = existingRoleChannels.map((channel) => channel._id);

    // Find all roles that are not linked to a channel yet
    const role = await Role.find({
      application: null,
      _id: { $nin: existingRoleIds },
    });

    if (!role.length) {
      logger.info('No roles without a channel found');
      return;
    }

    logger.info(
      `Found ${role.length} roles without a channel, creating channels...`
    );

    const channelsToAdd: Channel[] = [];

    for (const roles of role) {
      const channel = new Channel({
        title: `Role - ${roles.title}`,
        role: roles._id,
      });

      channelsToAdd.push(channel);
    }

    await Channel.insertMany(channelsToAdd);
    logger.info('Channels created successfully');
  } catch (err) {
    logger.error('Error trying to execute migration', err);
  }
};

/** Starts the DB and starts migration */
export const up = async () => {
  await startDatabaseForMigration();
  await createChannel();
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
