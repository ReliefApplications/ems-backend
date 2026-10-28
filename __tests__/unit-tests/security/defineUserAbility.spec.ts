import { Types } from 'mongoose';
import permissions from '@const/permissions';
import defineUserAbility from '@security/defineUserAbility';

jest.mock('@services/logger.service');

/**
 * Builds a role as populated on the request user.
 *
 * @param application application id, null for a back-office role
 * @param permissionTypes types of the (populated) permissions
 * @param global whether the permissions are global ones
 * @returns role-like object
 */
const buildRole = (
  application: Types.ObjectId | null,
  permissionTypes: string[],
  global: boolean
) => ({
  _id: new Types.ObjectId(),
  application,
  permissions: permissionTypes.map((type) => ({
    _id: new Types.ObjectId(),
    type,
    global,
  })),
});

/**
 * Lists the conditions of the rules allowing to update roles.
 * The application rule stores the application ids as a plain array, which Mongoose
 * casts to `$in` when querying, so rules are inspected rather than matched in memory.
 *
 * @param ability user ability
 * @returns conditions of each update Role rule (undefined for an unconditional rule)
 */
const updateRoleConditions = (ability: any) =>
  ability.rulesFor('update', 'Role').map((rule: any) => rule.conditions);

describe('defineUserAbility - global permissions (C-05)', () => {
  const APP_ID = new Types.ObjectId();

  it('grants back-office abilities from global permissions of back-office roles', () => {
    const ability = defineUserAbility({
      _id: new Types.ObjectId(),
      roles: [
        buildRole(
          null,
          [permissions.canSeeRoles, permissions.canSeeUsers],
          true
        ),
      ],
    } as any);
    expect(updateRoleConditions(ability)).toContainEqual(undefined);
    expect(ability.can('manage', 'User')).toBe(true);
  });

  it('ignores global permissions attached to an application role', () => {
    const ability = defineUserAbility({
      _id: new Types.ObjectId(),
      roles: [
        buildRole(
          APP_ID,
          [
            permissions.canSeeRoles,
            permissions.canSeeUsers,
            permissions.canSeeApplications,
            permissions.canManageApiConfigurations,
          ],
          true
        ),
      ],
    } as any);
    expect(ability.can('manage', 'User')).toBe(false);
    expect(ability.can('create', 'ApiConfiguration')).toBe(false);
    // Role management stays scoped to the application: no unconditional rule
    expect(updateRoleConditions(ability)).toEqual([{ application: [APP_ID] }]);
  });

  it('keeps application-scoped behaviour of application permissions', () => {
    const ability = defineUserAbility({
      _id: new Types.ObjectId(),
      roles: [buildRole(APP_ID, [permissions.canSeeRoles], false)],
    } as any);
    expect(updateRoleConditions(ability)).toEqual([{ application: [APP_ID] }]);
    expect(ability.can('manage', 'User')).toBe(false);
  });
});
