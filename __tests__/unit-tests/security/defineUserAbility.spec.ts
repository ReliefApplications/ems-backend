import permissions from '@const/permissions';
import {
  ApiConfiguration,
  Application,
  Dashboard,
  Form,
  Group,
  Layer,
  Notification,
  Page,
  Record,
  Resource,
  Role,
  User,
} from '@models';
import defineUserAbility from '@security/defineUserAbility';
import { Types } from 'mongoose';

/**
 * Build a role stub as stored on a logged user (populated permissions).
 *
 * @param perms Permission types held by the role
 * @param options Extra role properties (application, channels, global flag)
 * @returns role stub
 */
const buildRole = (
  perms: string[] = [],
  options: { application?: any; channels?: any[]; global?: boolean } = {}
): any => ({
  _id: new Types.ObjectId(),
  permissions: perms.map((type) => ({ type, global: options.global ?? true })),
  application: options.application,
  channels: options.channels,
});

/**
 * Build a user stub for ability definition.
 *
 * @param roles User roles
 * @param groups User groups (optional)
 * @returns user stub
 */
const buildUser = (roles: any[] = [], groups: any[] = []): User =>
  ({ _id: new Types.ObjectId(), roles, groups } as unknown as User);

describe('defineUserAbility', () => {
  describe('applications', () => {
    it('should give global readers access to any application content', () => {
      const user = buildUser([buildRole([permissions.canSeeApplications])]);
      const ability = defineUserAbility(user);

      expect(ability.can('read', new Application({ status: 'archived' }))).toBe(
        true
      );
      expect(ability.can('read', new Dashboard())).toBe(true);
      expect(ability.can('read', new Page())).toBe(true);
    });

    it('should limit other users to active applications of their roles', () => {
      const applicationId = new Types.ObjectId();
      const user = buildUser([buildRole([], { application: applicationId })]);
      const ability = defineUserAbility(user);

      expect(
        ability.can(
          'read',
          new Application({ _id: applicationId, status: 'active' })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Application({ _id: applicationId, status: 'archived' })
        )
      ).toBe(false);
      expect(
        ability.can('read', new Application({ status: 'active' }))
      ).toBe(false);
    });

    it('should give access to pages listing one of the user roles in canSee', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(
        ability.can(
          'read',
          new Page({ permissions: { canSee: [role._id] } })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Page({ permissions: { canSee: [new Types.ObjectId()] } })
        )
      ).toBe(false);
    });

    it('should only allow application creation with the dedicated permission', () => {
      const creator = buildUser([
        buildRole([permissions.canCreateApplications]),
      ]);
      const other = buildUser([buildRole()]);

      expect(defineUserAbility(creator).can('create', 'Application')).toBe(
        true
      );
      expect(defineUserAbility(other).can('create', 'Application')).toBe(
        false
      );
    });

    it('should give application managers full access to application content', () => {
      const user = buildUser([buildRole([permissions.canManageApplications])]);
      const ability = defineUserAbility(user);

      for (const action of ['create', 'read', 'update', 'delete'] as const) {
        expect(ability.can(action, new Application({ status: 'archived' }))).toBe(
          true
        );
        expect(ability.can(action, 'Template')).toBe(true);
      }
    });

    it('should limit updates and deletions to object permissions otherwise', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(
        ability.can(
          'update',
          new Page({ permissions: { canUpdate: [role._id] } })
        )
      ).toBe(true);
      expect(
        ability.can(
          'delete',
          new Page({ permissions: { canDelete: [role._id] } })
        )
      ).toBe(true);
      expect(ability.can('update', new Page({ permissions: {} }))).toBe(false);
      expect(ability.can('delete', new Page({ permissions: {} }))).toBe(false);
    });
  });

  describe('forms and records', () => {
    it('should give global form readers access to any form and record', () => {
      const user = buildUser([buildRole([permissions.canSeeForms])]);
      const ability = defineUserAbility(user);

      expect(ability.can('read', new Form())).toBe(true);
      expect(ability.can('read', new Record())).toBe(true);
    });

    it('should give access to forms through object or records permissions', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(
        ability.can('read', new Form({ permissions: { canSee: [role._id] } }))
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Form({ permissions: { canSeeRecords: [{ role: role._id }] } })
        )
      ).toBe(true);
      expect(ability.can('read', new Form({ permissions: {} }))).toBe(false);
    });

    it('should give form managers the manage action on records', () => {
      const manager = buildUser([buildRole([permissions.canManageForms])]);
      const other = buildUser([buildRole()]);

      expect(defineUserAbility(manager).can('manage', 'Record')).toBe(true);
      expect(defineUserAbility(other).can('manage', 'Record')).toBe(false);
    });
  });

  describe('resources', () => {
    it('should give global resource readers download and upload on records', () => {
      const user = buildUser([buildRole([permissions.canSeeResources])]);
      const ability = defineUserAbility(user);

      expect(ability.can('read', new Resource({ name: 'test' }))).toBe(true);
      expect(ability.can('download', new Record())).toBe(true);
      expect(ability.can('upload', new Record())).toBe(true);
    });

    it('should give access to resources through object or records permissions', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(
        ability.can(
          'read',
          new Resource({ name: 'test', permissions: { canSee: [role._id] } })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Resource({
            name: 'test',
            permissions: { canSeeRecords: [{ role: role._id }] },
          })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Resource({
            name: 'test',
            permissions: { canCreateRecords: [{ role: role._id }] },
          })
        )
      ).toBe(true);
      expect(
        ability.can('read', new Resource({ name: 'test', permissions: {} }))
      ).toBe(false);
    });
  });

  describe('roles and groups', () => {
    it('should give full access to roles and channels to global role managers', () => {
      const user = buildUser([buildRole([permissions.canSeeRoles])]);
      const ability = defineUserAbility(user);

      expect(ability.can('create', new Role())).toBe(true);
      expect(ability.can('delete', new Role())).toBe(true);
    });

    it('should only give other users read access to their own roles', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(ability.can('read', new Role({ _id: role._id }))).toBe(true);
      expect(ability.can('read', new Role())).toBe(false);
      expect(ability.can('update', new Role({ _id: role._id }))).toBe(false);
    });

    it('should give group readers access to groups', () => {
      const user = buildUser([buildRole([permissions.canSeeGroups])]);
      const other = buildUser([buildRole()]);

      expect(defineUserAbility(user).can('read', new Group())).toBe(true);
      expect(defineUserAbility(other).can('read', new Group())).toBe(false);
    });
  });

  describe('users', () => {
    it('should give user managers full access to users', () => {
      const user = buildUser([buildRole([permissions.canSeeUsers])]);
      const ability = defineUserAbility(user);

      expect(ability.can('manage', 'User')).toBe(true);
    });

    it('should give read-only access to users otherwise', () => {
      const ability = defineUserAbility(buildUser([buildRole()]));

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('update', 'User')).toBe(false);
    });
  });

  describe('notifications', () => {
    it('should give access to unseen notifications of the user channels', () => {
      const channelId = new Types.ObjectId();
      const role = buildRole([], { channels: [{ _id: channelId }] });
      const user = buildUser([role]);
      const ability = defineUserAbility(user);

      expect(
        ability.can(
          'read',
          new Notification({ channel: channelId, seenBy: [] })
        )
      ).toBe(true);
      expect(
        ability.can(
          'update',
          new Notification({ channel: channelId, seenBy: [] })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Notification({ channel: channelId, seenBy: [user._id] })
        )
      ).toBe(false);
      expect(
        ability.can(
          'read',
          new Notification({ channel: new Types.ObjectId(), seenBy: [] })
        )
      ).toBe(false);
    });

    it('should give access to unseen notifications targeting the user', () => {
      const user = buildUser([buildRole()]);
      const ability = defineUserAbility(user);

      expect(
        ability.can('read', new Notification({ user: user._id, seenBy: [] }))
      ).toBe(true);
      expect(
        ability.can(
          'read',
          new Notification({ user: user._id, seenBy: [user._id] })
        )
      ).toBe(false);
      expect(
        ability.can(
          'read',
          new Notification({ user: new Types.ObjectId(), seenBy: [] })
        )
      ).toBe(false);
    });
  });

  describe('api configurations and reference data', () => {
    it('should give full access to global api configuration managers', () => {
      const user = buildUser([
        buildRole([permissions.canManageApiConfigurations]),
      ]);
      const ability = defineUserAbility(user);

      expect(ability.can('create', 'ApiConfiguration')).toBe(true);
      expect(ability.can('delete', 'PullJob')).toBe(true);
      expect(ability.can('update', 'ReferenceData')).toBe(true);
    });

    it('should give read access and object-level edition otherwise', () => {
      const role = buildRole();
      const ability = defineUserAbility(buildUser([role]));

      expect(ability.can('read', new ApiConfiguration())).toBe(true);
      expect(
        ability.can(
          'update',
          new ApiConfiguration({ permissions: { canUpdate: [role._id] } })
        )
      ).toBe(true);
      expect(
        ability.can('update', new ApiConfiguration({ permissions: {} }))
      ).toBe(false);
      expect(ability.can('create', 'PullJob')).toBe(false);
    });
  });

  describe('layers and email notifications', () => {
    it('should require the dedicated permissions', () => {
      const user = buildUser([
        buildRole([
          permissions.canSeeLayer,
          permissions.canManageEmailNotifications,
        ]),
      ]);
      const other = buildUser([buildRole()]);

      expect(defineUserAbility(user).can('create', new Layer())).toBe(true);
      expect(defineUserAbility(user).can('update', 'EmailNotification')).toBe(
        true
      );
      expect(defineUserAbility(other).can('create', new Layer())).toBe(false);
      expect(defineUserAbility(other).can('read', 'EmailNotification')).toBe(
        false
      );
    });
  });
});
