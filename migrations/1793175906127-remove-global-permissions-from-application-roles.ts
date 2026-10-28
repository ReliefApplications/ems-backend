import { Permission, Role } from '@models';
import { logger } from '@services/logger.service';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description =
  'Remove back-office (global) permissions from application roles (security audit C-05).';

/**
 * Application roles must only hold application permissions: since C-05, the
 * ability builder ignores global permissions found on application roles and
 * editRole refuses them. This migration cleans the data so stored roles match.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const globalPermissionIds = (
    await Permission.find({ global: true }).select('_id')
  ).map((permission) => permission._id);
  const roles = await Role.find({
    application: { $ne: null },
    permissions: { $in: globalPermissionIds },
  })
    .select('title application permissions')
    .populate({ path: 'permissions', model: 'Permission' });
  for (const role of roles) {
    logger.info(
      `Role "${role.title}" (${role._id}) of application ${
        role.application
      } loses global permissions: ${role.permissions
        .filter((permission) => permission.global)
        .map((permission) => permission.type)
        .join(', ')}`
    );
  }
  const result = await Role.updateMany(
    { application: { $ne: null } },
    { $pull: { permissions: { $in: globalPermissionIds } } }
  );
  logger.info(
    `Removed global permissions from ${result.modifiedCount} application role(s)`
  );
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      The removed permissions are logged by the up migration and must be re-attached by hand if ever needed.
   */
};
