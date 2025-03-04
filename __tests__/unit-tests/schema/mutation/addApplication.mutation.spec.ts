import addApplication from '@schema/mutation/addApplication.mutation';
import mongoose from 'mongoose';
import { Application, Channel, Notification, Role } from '@models';
import pubsub from '@server/pubsub';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';

describe('addApplication Resolver', () => {
  let context;
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  // beforeEach(async () => {
  //   await Application.deleteMany({});
  // });

  beforeEach(async () => {
    context = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        ability: { can: jest.fn().mockReturnValue(true), cannot: jest.fn() },
        roles: [],
      },
      i18next: { t: jest.fn() },
      timeZone: 'UTC',
    } as unknown as Context;

    // context.user.ability.can.mockReturnValue(true);
    jest.spyOn(Channel, 'findOne').mockResolvedValue({
      id: new mongoose.Types.ObjectId(),
    });

    const publisher = await pubsub();
    jest.spyOn(publisher, 'publish').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      context.user = null;
      const result = addApplication.resolve(
        null,
        {},
        { ...context, user: null }
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should throw an error if the user is not authorized to create an application', async () => {
      context.user.ability.can.mockReturnValue(false);
      const result = addApplication.resolve(null, {}, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });
  });

  describe('Application Naming Logic', () => {
    it("should set application name to 'Untitled application 0' if no existing applications found", async () => {
      await Application.deleteMany({});

      const result = await addApplication.resolve(null, {}, context);
      expect(result.name).toBe('Untitled application 0');
    });

    it('should generate unique name for new application based on highest existing application number', async () => {
      const existingApplications = [
        { name: 'Untitled application 1' },
        { name: 'Untitled application 2' },
        { name: 'Untitled application 3' },
      ];
      await Application.create(existingApplications);
      const result = await addApplication.resolve(null, {}, context);
      expect(result.name).toBe('Untitled application 4');
    });
  });

  describe('Application Creation', () => {
    it('should create new application with correct default properties', async () => {
      const result = await addApplication.resolve(null, {}, context);
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Untitled application 5',
          _id: expect.any(mongoose.Types.ObjectId),
          status: 'pending',
          createdBy: context.user._id,
          permissions: {
            canSee: [
              expect.any(mongoose.Types.ObjectId),
              expect.any(mongoose.Types.ObjectId),
              expect.any(mongoose.Types.ObjectId),
            ],
            canUpdate: [],
            canDelete: [],
          },
        })
      );
    });

    it('should set permissions correctly if user has limited access', async () => {
      context.user.ability.can.mockReturnValue(false);
      context.user.ability.can.mockReturnValueOnce(true);
      const result = await addApplication.resolve(null, {}, context);
      expect(result.permissions.canSee).toEqual([
        expect.any(mongoose.Types.ObjectId),
        expect.any(mongoose.Types.ObjectId),
        expect.any(mongoose.Types.ObjectId),
      ]);
    });
  });

  describe('Notification Logic', () => {
    it('should create and save notification after application creation', async () => {
      await addApplication.resolve(null, {}, context);
      const notification = await Notification.findOne({
        action: 'Application created',
      });
      expect(notification).toBeTruthy();
    });

    it('should publish notification to appropriate channel', async () => {
      await addApplication.resolve(null, {}, context);
      expect((await pubsub()).publish).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        expect.objectContaining({ notification: expect.any(Object) })
      );
    });
  });

  describe('Channel and Role Creation', () => {
    it('should create main channel for the new application', async () => {
      const result = await addApplication.resolve(null, {}, context);
      const mainChannel = await Channel.findOne({
        title: 'main',
        application: result._id,
      });
      expect(mainChannel).toBeTruthy();
    });

    it('should create default roles and associate them with the new application', async () => {
      const result = await addApplication.resolve(null, {}, context);
      const roles = await Role.find({ application: result._id });
      expect(roles).toHaveLength(3);
      expect(roles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Editor' }),
          expect.objectContaining({ title: 'Manager' }),
          expect.objectContaining({ title: 'Guest' }),
        ])
      );
    });
  });

  describe('Error Handling', () => {
    it('should log error and throw GraphQLError if an error occurs during creation process', async () => {
      jest.spyOn(logger, 'error');
      jest.spyOn(Application.prototype, 'save').mockRejectedValue(new Error());
      const result = addApplication.resolve(null, {}, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return translated error message if a GraphQLError is thrown', async () => {
      // common.errors.userNotLogged    "You must be connected."
      jest
        .spyOn(Application.prototype, 'save')
        .mockRejectedValue(new GraphQLError('common.errors.userNotLogged'));

      const result = addApplication.resolve(null, {}, context);
      expect(result).rejects.toThrow('common.errors.userNotLogged');
    });
  });
});
