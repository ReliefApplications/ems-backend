import editPage, { EditPageArgs } from '@schema/mutation/editPage.mutation';
import { Page } from '@models';
import { contentType } from '@const/enumTypes';
import { Types } from 'mongoose';
import { Application, Workflow, Dashboard } from '@models';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import extendAbilityForPage from '@security/extendAbilityForPage';

// Mock the extendAbilityForPage function
jest.mock('@security/extendAbilityForPage', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    can: jest.fn().mockReturnValue(true),
    cannot: jest.fn().mockReturnValue(false),
  }),
}));

/**
 * Normalize the object IDs to strings
 *
 * @param objId object, either id, string, or array
 * @returns normalize object ids
 */
function normalizeObjectIds(objId: any) {
  if (typeof objId === 'string') {
    return objId;
  }
  if (Array.isArray(objId)) {
    return objId.map((id) => id.toString());
  }
  return Object.keys(objId).reduce((acc, key) => {
    acc[key] = normalizeObjectIds(objId[key]);
    return acc;
  }, {});
}

describe('editPage Resolver', () => {
  let context: Context;
  let args: EditPageArgs;
  let databaseHelpers: DatabaseHelpers;
  let application: Application;
  let page: Page;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  beforeAll(async () => {
    application = await Application.create({
      name: 'Test Application',
    });
    page = await Page.create({
      name: 'Test Page',
      application: application.id,
      permissions: {
        canSee: [new Types.ObjectId().toHexString()],
        canUpdate: [new Types.ObjectId().toHexString()],
        canDelete: [new Types.ObjectId().toHexString()],
      },
      visible: true,
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    context = {
      user: {
        _id: new Types.ObjectId(),
        ability: { can: jest.fn().mockReturnValue(true), cannot: jest.fn() },
        roles: [],
      },
      i18next: { t: jest.fn() },
      timeZone: 'UTC',
    } as unknown as Context;

    args = {
      id: page.id,
      name: 'Test Page',
      showName: true,
      icon: 'icon',
      permissions: {
        canSee: [new Types.ObjectId().toHexString()],
        canUpdate: [new Types.ObjectId().toHexString()],
        canDelete: [new Types.ObjectId().toHexString()],
      },
      visible: true,
    };

    // Reset the mock implementation extendAbilityForPage
    (extendAbilityForPage as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });

    // reset all mock functions
    // jest.clearAllMocks();
  });
  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      context.user = null;
      const result = editPage.resolve(null, args, { ...context, user: null });
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should throw an error if the user does not have permission to update the page', async () => {
      (extendAbilityForPage as jest.Mock).mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
        cannot: jest.fn().mockReturnValue(true),
      });
      const result = editPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Argument Validation', () => {
    it('should throw an error if no valid arguments are provided (other than id)', async () => {
      const result = editPage.resolve(null, { id: page.id }, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.page.edit.errors.invalidArguments'
      );
    });

    it('should throw an error if the provided page ID does not exist', async () => {
      args.id = new Types.ObjectId().toHexString();
      const result = editPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });
  });

  describe('Page Update Logic', () => {
    it('should update the page if valid arguments are provided', async () => {
      const updatedArgs = {
        ...args,
        name: 'Updated Page Name',
        visible: false,
        icon: 'new-icon',
        permissions: { canSee: [], canUpdate: [], canDelete: [] },
      };
      const result = await editPage.resolve(null, updatedArgs, context);
      expect(result.name).toBe(updatedArgs.name);
      expect(result.visible).toBe(updatedArgs.visible);
      expect(result.icon).toBe(updatedArgs.icon);
      expect(result.permissions).toEqual(updatedArgs.permissions);
    });
  });

  describe('Permission Update Logic', () => {
    it('should replace existing permission roles with new roles if an array is provided', async () => {
      args.permissions = {
        canSee: [new Types.ObjectId()],
        canUpdate: [new Types.ObjectId()],
        canDelete: [new Types.ObjectId()],
      };

      const result = await editPage.resolve(null, args, context);

      const expectedPermissions = normalizeObjectIds(args.permissions);
      const resultPermissions = normalizeObjectIds(result.permissions);
      expect(resultPermissions).toEqual(expectedPermissions);
    });

    it('should add roles to existing permissions if "add" is specified', async () => {
      args.permissions = {
        canSee: { add: [new Types.ObjectId()] },
        canUpdate: { add: [new Types.ObjectId()] },
        canDelete: { add: [new Types.ObjectId()] },
      };

      // get the page with the current permissions
      const currentPageState = await Page.findById(args.id);

      const result = await editPage.resolve(null, args, context);

      const expectedPermissions = {
        canSee: [
          ...currentPageState.permissions.canSee,
          ...args.permissions.canSee.add,
        ],
        canUpdate: [
          ...currentPageState.permissions.canUpdate,
          ...args.permissions.canUpdate.add,
        ],
        canDelete: [
          ...currentPageState.permissions.canDelete,
          ...args.permissions.canDelete.add,
        ],
      };
      const resultPermissions = normalizeObjectIds(result.permissions);
      expect(resultPermissions).toEqual(
        normalizeObjectIds(expectedPermissions)
      );
    });

    it('should remove roles from existing permissions if "remove" is specified', async () => {
      args.permissions = {
        canSee: { remove: [args.permissions.canSee[0]] },
        canUpdate: { remove: [args.permissions.canUpdate[0]] },
        canDelete: { remove: [args.permissions.canDelete[0]] },
      };

      // get the page with the current permissions
      const currentPageState = await Page.findById(args.id);

      const result = await editPage.resolve(null, args, context);

      const expectedPermissions = {
        canSee: currentPageState.permissions.canSee.filter(
          (id) => id.toString() !== args.permissions.canSee.remove[0]
        ),
        canUpdate: currentPageState.permissions.canUpdate.filter(
          (id) => id.toString() !== args.permissions.canUpdate.remove[0]
        ),
        canDelete: currentPageState.permissions.canDelete.filter(
          (id) => id.toString() !== args.permissions.canDelete.remove[0]
        ),
      };
      const resultPermissions = normalizeObjectIds(result.permissions);
      expect(resultPermissions).toEqual(
        normalizeObjectIds(expectedPermissions)
      );
    });
  });

  describe('Content Update Logic', () => {
    it('should update the content and properties for workflow pages', async () => {
      // create new page with workflow content
      const newPage = await Page.create({
        name: 'Workflow Page',
        application: application.id,
        type: contentType.workflow,
        content: await Workflow.create({
          name: 'Test Workflow',
        }),
      });

      const updatedArgs = {
        ...args,
        id: newPage.id,
        name: 'Updated Workflow Page',
      };

      const result = await editPage.resolve(null, updatedArgs, context);
      // get the workflow content
      const updatedWorkflow = await Workflow.findById(newPage.content);
      // check if the page name and workflow name are updated
      expect(result.name).toBe(updatedArgs.name);
      expect(updatedWorkflow.name).toBe(updatedArgs.name);
    });

    it('should update the content name and properties for dashboard pages', async () => {
      // create new page with dashboard content
      const newPage = await Page.create({
        name: 'Dashboard Page',
        application: application.id,
        type: contentType.dashboard,
        content: await Dashboard.create({
          name: 'Test Dashboard',
        }),
      });

      const updatedArgs = {
        ...args,
        id: newPage.id,
        name: 'Updated Dashboard Page',
      };

      const result = await editPage.resolve(null, updatedArgs, context);
      // get the dashboard content
      const updatedDashboard = await Dashboard.findById(newPage.content);
      // check if the page name and dashboard name are updated
      expect(result.name).toBe(updatedArgs.name);
      expect(updatedDashboard.name).toBe(updatedArgs.name);
    });
  });

  describe('Error Handling', () => {
    it('should log errors and throw a GraphQLError if an error occurs during page update', async () => {
      jest.spyOn(logger, 'error');
      jest.spyOn(Page, 'findByIdAndUpdate').mockRejectedValue(new Error());
      const result = editPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return a translated error message if a GraphQLError is thrown', async () => {
      jest
        .spyOn(Page, 'findById')
        .mockRejectedValue(new GraphQLError('common.errors.dataNotFound'));
      const result = editPage.resolve(null, args, context);
      expect(result).rejects.toThrow('common.errors.dataNotFound');
    });

    it('should throw an error if permissions update logic fails', async () => {
      args.permissions = {
        canSee: { add: 'invalid' },
      };
      const result = editPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
    });
  });
});
