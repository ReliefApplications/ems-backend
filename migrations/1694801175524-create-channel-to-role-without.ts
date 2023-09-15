import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Role, Channel } from '@models';
import { logger } from '../src/services/logger.service';
/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
const createChannel = async () => {
  try {
    const queryExistingRoleChannels = { role: { $exists: true, $ne: null } };
    const existingRoleChannels = await Channel.find(queryExistingRoleChannels);
    const existingRoleIds = existingRoleChannels.map((channel) => channel._id);

    const queryRole = { application: null, _id: { $nin: existingRoleIds } };
    const role = await Role.find(queryRole);

    for (const roles of role) {
      const channel = new Channel({
        title: `Role - ${roles.title}`,
        role: roles._id,
      });

      await channel.save();
    }
  } catch (err) {
    logger.error('Error trying to execute migration', err);
  }
};

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
