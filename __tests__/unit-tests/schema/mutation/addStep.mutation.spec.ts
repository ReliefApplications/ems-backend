import { Page, Step } from '@models';
import addStep from '@schema/mutation/addStep.mutation';
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

import editPage from '@schema/mutation/editPage.mutation';
import addPage from '@schema/mutation/addPage.mutation';
import { Workflow, Dashboard } from '@models';
import stepsQuery from '@schema/query/steps.query';

type AddStepArgs = {
  type: ContentType;
  content?: string | Types.ObjectId;
  workflow: string | Types.ObjectId;
};

// Mock the extendAbilityForPage function
jest.mock('@security/extendAbilityForPage', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    can: jest.fn().mockReturnValue(true),
    cannot: jest.fn().mockReturnValue(false),
  }),
}));

describe('addStep Resolver', () => {
  let context: Context;
  let args: AddStepArgs;
  let databaseHelpers: DatabaseHelpers;
  let application: Application;
  let workflowPage: Page;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  beforeAll(async () => {
    application = await Application.create({
      name: 'Test Application',
    });

    workflowPage = await Page.create({
      application: application._id,
      type: contentType.workflow,
      content: new Types.ObjectId(),
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
      workflow: workflowPage.content,
      content: workflowPage.content,
    } as AddStepArgs;

    // Reset the mock implementation extendAbilityForPage
    (extendAbilityForPage as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });
  });

  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      context.user = null;
      const result = addStep.resolve(null, args, { ...context, user: null });
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should throw an error if the user is not authorized to create a step', async () => {
      console.log('workflowPage', workflowPage._id);
      (context.user.ability.can as jest.Mock).mockReturnValue(false);
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Argument Validation', () => {
    it('should throw an error if workflow ID is not provided or invalid', async () => {
      args.workflow = null;
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.step.add.errors.invalidArguments'
      );
    });

    it('should throw an error if type is not in the valid content types', async () => {
      const newArgs = { ...args, type: 'invalid' } as unknown as AddStepArgs;
      const result = addStep.resolve(null, newArgs, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.step.add.errors.invalidArguments'
      );
    });
  });

  describe('Data Retrieval Logic', () => {
    it('should throw an error if the page linked to the workflow does not exist', async () => {
      args.workflow = new Types.ObjectId().toHexString();
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });

    it('should throw an error if the application linked to the page does not exist', async () => {
      args.workflow = new Types.ObjectId().toHexString();
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });

    it('should throw an error if the workflow associated with the workflow ID does not exist', async () => {
      // Test implementation
    });

    it('should throw an error if the form linked to the content ID does not exist (when type is not "dashboard")', async () => {
      // Test implementation
    });
  });

  describe('Step Creation Logic', () => {
    it('should create a linked Dashboard if type is "dashboard"', async () => {});

    it('should set the step name to the form name if type is not "dashboard"', async () => {
      // Test implementation
    });

    it('should create a new step with correct default permissions', async () => {
      // Test implementation
    });

    it('should link the new step to the workflow by updating the workflow document', async () => {
      // Test implementation
    });
  });

  describe('Authorization', () => {
    it('should throw an error if the user does not have permission to update the application', async () => {
      (context.user.ability.can as jest.Mock).mockReturnValue(false);
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Error Handling', () => {
    it('should log an error and throw a GraphQLError if an unexpected error occurs', async () => {
      jest.spyOn(logger, 'error');
      jest.spyOn(Page, 'findOne').mockRejectedValue(new Error('Test error'));
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return a translated error message if a GraphQLError is thrown', async () => {
      jest
        .spyOn(Page, 'findOne')
        .mockRejectedValue(new GraphQLError('common.errors.dataNotFound'));
      const result = addStep.resolve(null, args, context);
      await expect(result).rejects.toThrow('common.errors.dataNotFound');
    });
  });
});
