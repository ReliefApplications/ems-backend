import { Page } from '@models';
import addPage from '@schema/mutation/addPage.mutation';
import { ContentType, contentType } from '@const/enumTypes';
import { Types } from 'mongoose';
import addApplication from '@schema/mutation/addApplication.mutation';
import { Application, Channel, Notification, Role } from '@models';
import pubsub from '@server/pubsub';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';

type AddPageArgs = {
  type: ContentType;
  content?: string | Types.ObjectId;
  application: string | Types.ObjectId;
  duplicate?: string | Types.ObjectId;
  structure?: any;
};

describe('addPage Resolver', () => {
  let context: Context;

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
  });

  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      context.user = null;
      const args = {
        type: 'workflow',
        application: new Types.ObjectId(),
      } as AddPageArgs;
      const result = addPage.resolve(null, args, { ...context, user: null });
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
describe('addPage Resolver', () => {
  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      // Test implementation
    });

    it('should throw an error if the user does not have permission to create a page', async () => {
      // Test implementation
    });
  });

  describe('Argument Validation', () => {
    it('should throw an error if required arguments are missing or invalid', async () => {
      // Test implementation
    });

    it('should throw an error if application is not found', async () => {
      // Test implementation
    });

    it('should throw an error if form content does not exist when type is form', async () => {
      // Test implementation
    });
  });

  describe('Workflow and Dashboard Creation', () => {
    it('should create a new workflow if type is workflow', async () => {
      // Test implementation
    });

    it('should create a new dashboard with specified structure if type is dashboard', async () => {
      // Test implementation
    });
  });

  describe('Form Handling', () => {
    it('should find and use existing form if type is form', async () => {
      // Test implementation
    });

    it('should throw an error if form is not found when type is form', async () => {
      // Test implementation
    });
  });

  describe('Page Creation', () => {
    it('should create a new page with appropriate permissions based on roles', async () => {
      // Test implementation
    });

    it('should associate the newly created page with the application', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('should log the error and throw GraphQLError on unexpected errors', async () => {
      // Test implementation
    });

    it('should return a translated internal server error if an unknown error is thrown', async () => {
      // Test implementation
    });
  });
});
