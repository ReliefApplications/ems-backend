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
