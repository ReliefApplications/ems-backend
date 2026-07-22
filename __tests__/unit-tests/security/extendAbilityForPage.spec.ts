import { Application, Page, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/**
 * Build a user stub with a single role and its base ability.
 *
 * @param roleId Id of the user role
 * @returns user stub
 */
const buildUser = (roleId: Types.ObjectId): User => {
  const user = {
    _id: new Types.ObjectId(),
    roles: [{ _id: roleId, permissions: [] }],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

let databaseHelpers: DatabaseHelpers;

describe('extendAbilityForPage', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  describe('on a page', () => {
    it('should give read access when a role can see the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const page = await Page.create({ name: 'Page - see' });
      const otherPage = await Page.create({ name: 'Page - see (other)' });
      await Application.create({
        name: 'App - see',
        pages: [page._id],
        permissions: { canSee: [roleId] },
      });

      const ability = await extendAbilityForPage(user, page);

      expect(ability.can('read', page)).toBe(true);
      expect(ability.can('update', page)).toBe(false);
      expect(ability.can('delete', page)).toBe(false);
      expect(ability.can('read', otherPage)).toBe(false);
    });

    it('should give write and delete access when a role can update the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const page = await Page.create({ name: 'Page - update' });
      await Application.create({
        name: 'App - update',
        pages: [page._id],
        permissions: { canUpdate: [roleId] },
      });

      const ability = await extendAbilityForPage(user, page);

      expect(ability.can('update', page)).toBe(true);
      expect(ability.can('delete', page)).toBe(true);
      expect(ability.can('read', page)).toBe(false);
    });

    it('should not extend anything when the user roles are not on the application', async () => {
      const user = buildUser(new Types.ObjectId());
      const page = await Page.create({ name: 'Page - none' });
      await Application.create({
        name: 'App - none',
        pages: [page._id],
        permissions: {
          canSee: [new Types.ObjectId()],
          canUpdate: [new Types.ObjectId()],
        },
      });

      const ability = await extendAbilityForPage(user, page);

      expect(ability.can('read', page)).toBe(false);
      expect(ability.can('update', page)).toBe(false);
      expect(ability.can('delete', page)).toBe(false);
    });

    it('should keep access given by the page own permissions', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const page = await Page.create({
        name: 'Page - own permission',
        permissions: { canSee: [roleId] },
      });

      const ability = await extendAbilityForPage(user, page);

      expect(ability.can('read', page)).toBe(true);
    });
  });

  describe('on an application', () => {
    it('should extend the ability for every page of the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const pageA = await Page.create({ name: 'Page A - app' });
      const pageB = await Page.create({ name: 'Page B - app' });
      const application = await Application.create({
        name: 'App - all pages',
        pages: [pageA._id, pageB._id],
        permissions: { canSee: [roleId] },
      });

      const ability = await extendAbilityForPage(user, application);

      expect(ability.can('read', pageA)).toBe(true);
      expect(ability.can('read', pageB)).toBe(true);
      expect(ability.can('create', 'Page')).toBe(false);
    });

    it('should give page creation to users who can update the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const page = await Page.create({ name: 'Page - creation' });
      const application = await Application.create({
        name: 'App - creation',
        pages: [page._id],
        permissions: { canUpdate: [roleId] },
      });

      const ability = await extendAbilityForPage(user, application);

      expect(ability.can('create', 'Page')).toBe(true);
      expect(ability.can('update', page)).toBe(true);
    });
  });

  it('should throw for an unexpected object type', async () => {
    const user = buildUser(new Types.ObjectId());

    await expect(
      extendAbilityForPage(user, { name: 'not a model' } as any)
    ).rejects.toThrow('Unexpected type');
  });
});
