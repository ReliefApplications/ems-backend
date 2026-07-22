import permissions from '@const/permissions';
import { Application, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import extendAbilityForApplication from '@security/extendAbilityForApplication';
import { Types } from 'mongoose';

/**
 * Build a user stub holding application-scoped permissions, with its base
 * ability already defined.
 *
 * @param application Application the role is scoped to
 * @param perms Permission types held by the role
 * @returns user stub
 */
const buildUser = (application: Types.ObjectId, perms: string[]): User => {
  const user = {
    _id: new Types.ObjectId(),
    roles: [
      {
        _id: new Types.ObjectId(),
        application,
        permissions: perms.map((type) => ({ type })),
      },
    ],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

describe('extendAbilityForApplication', () => {
  const applicationId = new Types.ObjectId();
  const application = applicationId.toString();

  it('should give template management to application template managers', () => {
    const user = buildUser(applicationId, [permissions.canManageTemplates]);

    const ability = extendAbilityForApplication(user, application);

    expect(ability.can('create', 'Template')).toBe(true);
    expect(ability.can('manage', 'Template')).toBe(true);
    expect(ability.can('manage', 'DistributionList')).toBe(false);
  });

  it('should give distribution list management to the dedicated role', () => {
    const user = buildUser(applicationId, [
      permissions.canManageDistributionLists,
    ]);

    const ability = extendAbilityForApplication(user, application);

    expect(ability.can('manage', 'DistributionList')).toBe(true);
    expect(ability.can('manage', 'Template')).toBe(false);
  });

  it('should give custom notification management to the dedicated role', () => {
    const user = buildUser(applicationId, [
      permissions.canManageCustomNotifications,
    ]);

    const ability = extendAbilityForApplication(user, application);

    expect(ability.can('manage', 'CustomNotification')).toBe(true);
  });

  it('should split email notification permissions by action', () => {
    const reader = buildUser(applicationId, [
      permissions.canSeeEmailNotifications,
    ]);
    const editor = buildUser(applicationId, [
      permissions.canUpdateEmailNotifications,
    ]);
    const creator = buildUser(applicationId, [
      permissions.canCreateEmailNotifications,
    ]);

    const readerAbility = extendAbilityForApplication(reader, application);
    expect(readerAbility.can('read', 'EmailNotification')).toBe(true);
    expect(readerAbility.can('update', 'EmailNotification')).toBe(false);
    expect(readerAbility.can('create', 'EmailNotification')).toBe(false);

    const editorAbility = extendAbilityForApplication(editor, application);
    expect(editorAbility.can('update', 'EmailNotification')).toBe(true);
    expect(editorAbility.can('delete', 'EmailNotification')).toBe(true);
    expect(editorAbility.can('read', 'EmailNotification')).toBe(false);

    const creatorAbility = extendAbilityForApplication(creator, application);
    expect(creatorAbility.can('create', 'EmailNotification')).toBe(true);
    expect(creatorAbility.can('update', 'EmailNotification')).toBe(false);
  });

  it('should give user management on the application to user readers', () => {
    const user = buildUser(applicationId, [permissions.canSeeUsers]);

    const ability = extendAbilityForApplication(user, application);

    expect(ability.can('manageUsers', 'Application')).toBe(true);
  });

  it('should not extend anything for roles of another application', () => {
    const user = buildUser(new Types.ObjectId(), [
      permissions.canManageTemplates,
      permissions.canManageDistributionLists,
      permissions.canManageCustomNotifications,
      permissions.canSeeEmailNotifications,
      permissions.canSeeUsers,
    ]);

    const ability = extendAbilityForApplication(user, application);

    expect(ability.can('manage', 'Template')).toBe(false);
    expect(ability.can('manage', 'DistributionList')).toBe(false);
    expect(ability.can('manage', 'CustomNotification')).toBe(false);
    expect(ability.can('read', 'EmailNotification')).toBe(false);
    expect(ability.can('manageUsers', 'Application')).toBe(false);
  });

  it('should keep the base ability rules of the user', () => {
    const user = buildUser(applicationId, [permissions.canManageTemplates]);

    const ability = extendAbilityForApplication(user, application);

    // From defineUserAbility: user can read the active applications of its roles
    expect(
      ability.can(
        'read',
        new Application({ _id: applicationId, status: 'active' })
      )
    ).toBe(true);
  });

  it('should extend a provided ability instead of the user one', () => {
    const user = buildUser(applicationId, [permissions.canSeeUsers]);
    const admin = {
      _id: new Types.ObjectId(),
      roles: [
        {
          _id: new Types.ObjectId(),
          permissions: [
            { type: permissions.canManageApplications, global: true },
          ],
        },
      ],
    } as unknown as User;
    const baseAbility = defineUserAbility(admin);

    const ability = extendAbilityForApplication(user, application, baseAbility);

    expect(ability.can('manageUsers', 'Application')).toBe(true);
    // Inherited from the provided base ability, not from the user one
    expect(ability.can('manage', 'Dashboard')).toBe(true);
  });
});
