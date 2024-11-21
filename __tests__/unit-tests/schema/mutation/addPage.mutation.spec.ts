import { Page } from '@models';
import addPage from '@schema/mutation/addPage.mutation';
import { ContentType, contentType } from '@const/enumTypes';
import { Types } from 'mongoose';
import addApplication from '@schema/mutation/addApplication.mutation';
import { Application, Channel, Notification, Role, Form } from '@models';
import pubsub from '@server/pubsub';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import extendAbilityForPage from '@security/extendAbilityForPage';

type AddPageArgs = {
  type: ContentType;
  content?: string | Types.ObjectId;
  application: string | Types.ObjectId;
  duplicate?: string | Types.ObjectId;
  structure?: any;
};

// Mock the extendAbilityForPage function
jest.mock('@security/extendAbilityForPage', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    can: jest.fn().mockReturnValue(true),
    cannot: jest.fn().mockReturnValue(false),
  }),
}));

describe('addPage Resolver', () => {
  let context: Context;
  let args: AddPageArgs;
  let databaseHelpers: DatabaseHelpers;
  let application: Application;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  beforeAll(async () => {
    application = await Application.create({
      name: 'Test Application',
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
      type: 'workflow',
      application: application.id,
    };

    // Reset the mock implementation extendAbilityForPage
    (extendAbilityForPage as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });
  });

  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      context.user = null;
      const result = addPage.resolve(null, args, { ...context, user: null });
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should throw an error if the user does not have permission to create a page', async () => {
      (extendAbilityForPage as jest.Mock).mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
        cannot: jest.fn().mockReturnValue(true),
      });
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Argument Validation', () => {
    it('should throw an error if required arguments are missing or invalid', async () => {
      args = {} as AddPageArgs;
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.page.add.errors.invalidArguments'
      );
    });

    it('should throw an error if application is not found', async () => {
      args.application = new Types.ObjectId().toHexString();
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });

    it('should throw an error if form content does not exist when type is form', async () => {
      args.type = 'form';
      args.content = new Types.ObjectId().toHexString();
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
    });
  });

  describe('Workflow and Dashboard Creation', () => {
    it('should create a new workflow if type is workflow', async () => {
      args.type = 'workflow';
      const result = addPage.resolve(null, args, context);
      await expect(result).resolves.toBeInstanceOf(Page);
    });

    it('should create a new dashboard with specified structure if type is dashboard', async () => {
      args.type = 'dashboard';
      args.structure = { rows: [] };
      const result = addPage.resolve(null, args, context);
      await expect(result).resolves.toBeInstanceOf(Page);
    });
  });

  describe('Form Handling', () => {
    it('should find and use existing form if type is form', async () => {
      const form = await Form.create({
        name: 'Test Form',
      });
      args.type = 'form';
      args.content = form.id;
      const result = addPage.resolve(null, args, context);
      await expect(result).resolves.toBeInstanceOf(Page);
      const page = await result;
      expect(page.name).toBe(form.name);
      expect(page.content.toString()).toBe(form.id);
    });

    it('should throw an error if form is not found when type is form', async () => {
      args.type = 'form';
      args.content = new Types.ObjectId().toHexString();
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
    });
  });

  describe('Page Creation', () => {
    it('should create a new page with appropriate permissions based on roles', async () => {
      const result = addPage.resolve(null, args, context);
      await expect(result).resolves.toBeInstanceOf(Page);
      const page = await result;
      expect(page.name).toBe('Workflow');
      expect(page.type).toBe('workflow');
      expect(page.permissions.canSee).toEqual([]);
      expect(page.permissions.canUpdate).toEqual([]);
      expect(page.permissions.canDelete).toEqual([]);
    });

    it('should associate the newly created page with the application', async () => {
      const result = addPage.resolve(null, args, context);
      await expect(result).resolves.toBeInstanceOf(Page);
      // the application should now have the new page id in its pages array
      const updatedApplication = await Application.findById(application.id);
      expect(updatedApplication.pages.map((page) => page.toString())).toContain(
        (await result)._id.toString()
      );
    });
  });

  describe('Error Handling', () => {
    it('should log the error and throw GraphQLError on unexpected errors', async () => {
      jest.spyOn(logger, 'error');
      jest.spyOn(Page.prototype, 'save').mockRejectedValue(new Error());
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return a translated internal server error if an unknown error is thrown', async () => {
      jest
        .spyOn(Page.prototype, 'save')
        .mockRejectedValue(
          new GraphQLError('common.errors.internalServerError')
        );
      const result = addPage.resolve(null, args, context);
      await expect(result).rejects.toThrow('common.errors.internalServerError');
    });
  });
});
