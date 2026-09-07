import { Resource } from '@models';
import editResource from '@schema/mutation/editResource.mutation';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

describe('editResource Resolver', () => {
  let databaseHelpers: DatabaseHelpers;
  let context: Context;
  let resource: Resource;
  let resourceCounter = 0;
  const roleA = new Types.ObjectId();
  const roleB = new Types.ObjectId();
  const roleC = new Types.ObjectId();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    resourceCounter += 1;
    resource = await Resource.create({
      name: `Test resource ${resourceCounter}`,
      fields: [
        { name: 'name', type: 'text' },
        { name: 'age', type: 'numeric' },
      ],
      permissions: {
        canSee: [roleA],
        canUpdate: [roleA],
        canDelete: [roleA],
        canSeeRecords: [{ role: roleA }],
      },
    });
    context = {
      user: {
        _id: new Types.ObjectId(),
        ability: {
          can: jest.fn().mockReturnValue(true),
          cannot: jest.fn().mockReturnValue(false),
        },
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** @returns the ids, as strings, of the given permission array */
  const ids = (permission: any[]) => permission.map((x) => String(x));

  describe('Access checks', () => {
    it('should throw an error if the user is not logged in', async () => {
      context = { ...context, user: null } as unknown as Context;
      const result = editResource.resolve(
        null,
        { id: resource.id, fields: [] },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should throw an error if no update arguments are provided', async () => {
      const result = editResource.resolve(null, { id: resource.id }, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.resource.edit.errors.invalidArguments'
      );
    });

    it('should throw an error if the user cannot update the resource', async () => {
      (context.user.ability.cannot as jest.Mock).mockReturnValue(true);
      const result = editResource.resolve(
        null,
        { id: resource.id, permissions: { canSee: [String(roleB)] } },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Permissions replacement ( array format )', () => {
    it('should replace canSee, canUpdate & canDelete with the provided lists', async () => {
      const newRoles = [String(roleA), String(roleB)];
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: {
            canSee: newRoles,
            canUpdate: newRoles,
            canDelete: newRoles,
          },
        },
        context
      );
      expect(ids(updated.permissions.canSee)).toEqual(newRoles);
      expect(ids(updated.permissions.canUpdate)).toEqual(newRoles);
      expect(ids(updated.permissions.canDelete)).toEqual(newRoles);
      // Check persistence in database, not only the returned document
      const inDatabase = await Resource.findById(resource.id);
      expect(ids(inDatabase.permissions.canSee)).toEqual(newRoles);
      expect(ids(inDatabase.permissions.canUpdate)).toEqual(newRoles);
      expect(ids(inDatabase.permissions.canDelete)).toEqual(newRoles);
    });

    it('should be able to clear a permission with an empty list', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canDelete: [] },
        },
        context
      );
      expect(updated.permissions.canDelete).toHaveLength(0);
    });

    it('should not touch permissions that do not appear in the arguments', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSee: [String(roleB)] },
        },
        context
      );
      expect(ids(updated.permissions.canSee)).toEqual([String(roleB)]);
      expect(ids(updated.permissions.canUpdate)).toEqual([String(roleA)]);
      expect(ids(updated.permissions.canDelete)).toEqual([String(roleA)]);
      expect(updated.permissions.canSeeRecords).toHaveLength(1);
      expect(String(updated.permissions.canSeeRecords[0].role)).toEqual(
        String(roleA)
      );
    });

    it('should replace records permissions with the provided role & access lists', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: {
            canSeeRecords: [{ role: String(roleB) }, { role: String(roleC) }],
          },
        },
        context
      );
      expect(updated.permissions.canSeeRecords).toHaveLength(2);
      expect(
        updated.permissions.canSeeRecords.map((x: any) => String(x.role))
      ).toEqual([String(roleB), String(roleC)]);
    });
  });

  describe('Permissions add / remove ( object format )', () => {
    it('should add new roles to canSee', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSee: { add: [String(roleB)] } },
        },
        context
      );
      expect(ids(updated.permissions.canSee)).toEqual([
        String(roleA),
        String(roleB),
      ]);
    });

    it('should remove roles from canSee', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSee: { remove: [String(roleA)] } },
        },
        context
      );
      expect(updated.permissions.canSee).toHaveLength(0);
    });

    it('should add a records permission, and grant matching fields permissions', async () => {
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSeeRecords: { add: [{ role: String(roleB) }] } },
        },
        context
      );
      expect(
        updated.permissions.canSeeRecords.map((x: any) => String(x.role))
      ).toEqual([String(roleA), String(roleB)]);
      // 'Common sense' rule: role now sees records, so it should see all fields
      for (const field of updated.fields) {
        expect(ids(field.permissions.canSee)).toContain(String(roleB));
      }
    });

    it('should remove a records permission, and clear matching fields permissions', async () => {
      // First add the permission, so fields permissions exist for the role
      await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSeeRecords: { add: [{ role: String(roleB) }] } },
        },
        context
      );
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSeeRecords: { remove: [{ role: String(roleB) }] } },
        },
        context
      );
      expect(
        updated.permissions.canSeeRecords.map((x: any) => String(x.role))
      ).toEqual([String(roleA)]);
      for (const field of updated.fields) {
        expect(ids(field.permissions.canSee)).not.toContain(String(roleB));
      }
    });

    it('should refuse an update records permission on a role that cannot see records', async () => {
      const result = editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canUpdateRecords: { add: [{ role: String(roleB) }] } },
        },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.resource.edit.errors.permission.updateRecords.notVisible'
      );
    });
  });

  describe('Fields permissions ( batched )', () => {
    it('should grant a field permission to several roles in one request', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $push: { 'permissions.canSeeRecords': { role: roleB } },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsPermissions: {
            canSee: {
              add: [
                { field: 'name', role: String(roleA) },
                { field: 'name', role: String(roleB) },
              ],
            },
          },
        },
        context
      );
      const name = updated.fields.find((f: any) => f.name === 'name');
      expect(ids(name.permissions.canSee).sort()).toEqual(
        [String(roleA), String(roleB)].sort()
      );
    });

    it('should remove a field permission from several roles in one request', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $set: {
          'fields.0.permissions': { canSee: [roleA, roleB], canUpdate: [] },
        },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsPermissions: {
            canSee: {
              remove: [
                { field: 'name', role: String(roleA) },
                { field: 'name', role: String(roleB) },
              ],
            },
          },
        },
        context
      );
      const name = updated.fields.find((f: any) => f.name === 'name');
      expect(ids(name.permissions.canSee)).toEqual([]);
    });

    it('should accept canSee & canUpdate grants on the same field / role in one request', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $push: { 'permissions.canCreateRecords': { role: roleA } },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsPermissions: {
            canSee: { add: { field: 'name', role: String(roleA) } },
            canUpdate: { add: { field: 'name', role: String(roleA) } },
          },
        },
        context
      );
      const name = updated.fields.find((f: any) => f.name === 'name');
      expect(ids(name.permissions.canSee)).toEqual([String(roleA)]);
      expect(ids(name.permissions.canUpdate)).toEqual([String(roleA)]);
    });
  });

  describe('Fields auto-grant', () => {
    it('should opt a role out, then back in', async () => {
      let updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsAutoGrant: { canSee: { remove: [String(roleA)] } },
        },
        context
      );
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([
        String(roleA),
      ]);
      updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsAutoGrant: { canSee: { add: [String(roleA)] } },
        },
        context
      );
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([]);
    });

    it('should refuse to opt in a role that cannot see records', async () => {
      const result = editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsAutoGrant: { canSee: { add: [String(roleB)] } },
        },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.resource.edit.errors.fieldsAutoGrant.missingReadPermissionOnResource'
      );
    });

    it('should accept an opt in together with the records permission grant', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $push: { 'permissions.fieldsAutoGrantCanSeeOptOut': roleB },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: { canSeeRecords: { add: [{ role: String(roleB) }] } },
          fieldsAutoGrant: { canSee: { add: [String(roleB)] } },
        },
        context
      );
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([]);
    });

    it('should opt a role out of canUpdate auto-grant, and refuse to opt in without write access', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $push: { 'permissions.canUpdateRecords': { role: roleA } },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsAutoGrant: { canUpdate: { remove: [String(roleA)] } },
        },
        context
      );
      expect(ids(updated.permissions.fieldsAutoGrantCanUpdateOptOut)).toEqual([
        String(roleA),
      ]);
      // roleB cannot update nor create records
      const result = editResource.resolve(
        null,
        {
          id: resource.id,
          fieldsAutoGrant: { canUpdate: { add: [String(roleB)] } },
        },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.resource.edit.errors.fieldsAutoGrant.missingWritePermissionOnResource'
      );
    });

    it('should keep fields permissions and opt-out when removing a filtered rule while a global one remains', async () => {
      const access = { logic: 'and', filters: [] };
      await Resource.findByIdAndUpdate(resource.id, {
        $push: {
          'permissions.canSeeRecords': { role: roleA, access },
          'permissions.fieldsAutoGrantCanSeeOptOut': roleA,
        },
        $set: {
          'fields.0.permissions': { canSee: [roleA], canUpdate: [] },
        },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: {
            canSeeRecords: { remove: [{ role: String(roleA), access }] },
          },
        },
        context
      );
      // Global rule remains, so nothing else should be cleared
      expect(
        updated.permissions.canSeeRecords.map((x: any) => String(x.role))
      ).toEqual([String(roleA)]);
      expect(ids(updated.fields[0].permissions.canSee)).toEqual([
        String(roleA),
      ]);
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([
        String(roleA),
      ]);
    });

    it('should not let another role filtered rule prevent clearing fields permissions', async () => {
      const access = { logic: 'and', filters: [] };
      await Resource.findByIdAndUpdate(resource.id, {
        $push: {
          'permissions.canSeeRecords': { role: roleB, access },
          'permissions.fieldsAutoGrantCanSeeOptOut': roleA,
        },
        $set: {
          'fields.0.permissions': { canSee: [roleA, roleB], canUpdate: [] },
        },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: {
            canSeeRecords: { remove: [{ role: String(roleA) }] },
          },
        },
        context
      );
      // roleA has no see access left: its fields permissions & opt-out are cleared
      expect(ids(updated.fields[0].permissions.canSee)).toEqual([
        String(roleB),
      ]);
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([]);
    });

    it('should clear the opt-out of every role losing see access in one request', async () => {
      await Resource.findByIdAndUpdate(resource.id, {
        $push: {
          'permissions.canSeeRecords': { role: roleB },
          'permissions.fieldsAutoGrantCanSeeOptOut': { $each: [roleA, roleB] },
        },
      });
      const updated = await editResource.resolve(
        null,
        {
          id: resource.id,
          permissions: {
            canSeeRecords: {
              remove: [{ role: String(roleA) }, { role: String(roleB) }],
            },
          },
        },
        context
      );
      expect(updated.permissions.canSeeRecords).toEqual([]);
      expect(ids(updated.permissions.fieldsAutoGrantCanSeeOptOut)).toEqual([]);
    });
  });

  describe('Fields update', () => {
    it('should replace the fields of the resource', async () => {
      const newFields = [
        { name: 'name', type: 'text' },
        { name: 'country', type: 'text' },
      ];
      const updated = await editResource.resolve(
        null,
        { id: resource.id, fields: newFields },
        context
      );
      expect(updated.fields.map((f: any) => f.name)).toEqual([
        'name',
        'country',
      ]);
      const inDatabase = await Resource.findById(resource.id);
      expect(inDatabase.fields.map((f: any) => f.name)).toEqual([
        'name',
        'country',
      ]);
    });
  });

  describe('Error handling', () => {
    it('should log the error and throw GraphQLError on unexpected errors', async () => {
      jest
        .spyOn(Resource, 'findByIdAndUpdate')
        .mockRejectedValue(new Error('unexpected error'));
      const result = editResource.resolve(
        null,
        { id: resource.id, permissions: { canSee: [String(roleB)] } },
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.internalServerError'
      );
    });
  });
});
