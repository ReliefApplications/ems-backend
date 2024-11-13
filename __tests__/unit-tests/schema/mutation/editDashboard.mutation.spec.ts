// import { GraphQLError } from 'graphql';
import { Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { graphQLAuthCheck } from '@schema/shared';
// import axios from 'axios';
import { logger } from '@services/logger.service';
import resolver from '@schema/mutation/editDashboard.mutation';
import { GraphQLError } from 'graphql';

jest.mock('@models');
jest.mock('@security/extendAbilityForContent');
jest.mock('@schema/shared');
jest.mock('axios');
jest.mock('@services/logger.service');

describe('Edit Dashboard Mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if arguments are empty', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: { t: jest.fn().mockReturnValue('Error Message') },
      user: {} as any,
      timeZone: 'any',
    };
    const args: any = {}; // Empty args
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'Error Message'
    );
    expect(context.i18next.t).toHaveBeenCalledWith(
      'mutations.dashboard.edit.errors.invalidArguments'
    );
  });

  it('should throw error if arguments are missing', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: { t: jest.fn().mockReturnValue('Error Message') },
      user: {} as any,
      timeZone: 'any',
    };
    await expect(resolver.resolve(null, null, context)).rejects.toThrow(
      'Error Message'
    );
    expect(context.i18next.t).toHaveBeenCalledWith(
      'mutations.dashboard.edit.errors.invalidArguments'
    );
  });

  it('should throw error if user is not authorized to update the dashboard', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: { t: jest.fn().mockReturnValue('Permission Denied') },
      user: {
        id: 'mockUser',
      } as any,
      timeZone: 'any',
    };
    const mockDashboard = { id: 'dashboardId' };
    (Dashboard.findById as jest.Mock).mockResolvedValue(mockDashboard);
    (extendAbilityForContent as jest.Mock).mockResolvedValue({
      cannot: jest.fn().mockReturnValue(true),
    });
    const args = { id: 'dashboardId' };

    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'Permission Denied'
    );
    expect(context.i18next.t).toHaveBeenCalledWith(
      'common.errors.permissionNotGranted'
    );
    expect(Dashboard.findById).toHaveBeenCalledWith(args.id);
    expect(extendAbilityForContent).toHaveBeenCalledWith(
      context.user,
      mockDashboard
    );
  });

  it('should log & throw GraphQLError on failure', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: { t: jest.fn().mockReturnValue('Database error') },
      user: {} as any,
      timeZone: 'any',
    };
    (Dashboard.findById as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );
    const args = { id: 'dashboardId' };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'Database error'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Database error',
      expect.any(Object)
    );
    expect(Dashboard.findById).toHaveBeenCalledWith(args.id);
  });

  it('should log & throw GraphQLError on failure', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: { t: jest.fn().mockReturnValue('Database error') },
      user: {} as any,
      timeZone: 'any',
    };
    (Dashboard.findById as jest.Mock).mockRejectedValue(
      new GraphQLError('Database error')
    );
    const args = { id: 'dashboardId' };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'Database error'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Database error',
      expect.any(Object)
    );
    expect(Dashboard.findById).toHaveBeenCalledWith(args.id);
  });

  it('should update dashboard & related page & step', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context = {
      i18next: jest.fn(),
      user: {} as any,
      timeZone: 'any',
    };
    const mockDashboard = { id: 'dashboardId', toObject: jest.fn() };
    (Dashboard.findById as jest.Mock).mockResolvedValue(mockDashboard);
    (Dashboard.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockDashboard,
      name: 'Updated Dashboard',
    });
    (Page.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (Step.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (extendAbilityForContent as jest.Mock).mockResolvedValue({
      cannot: jest.fn().mockReturnValue(false),
    });

    const args = { id: 'dashboardId', name: 'Updated Dashboard' };
    await resolver.resolve(null, args, context);

    expect(Dashboard.findByIdAndUpdate).toHaveBeenCalledWith(
      'dashboardId',
      { name: 'Updated Dashboard' },
      { new: true }
    );
    expect(Page.findOneAndUpdate).toHaveBeenCalledWith(
      { content: args.id },
      expect.objectContaining({ name: 'Updated Dashboard' })
    );
    expect(Step.findOneAndUpdate).toHaveBeenCalledWith(
      { content: args.id },
      expect.objectContaining({ name: 'Updated Dashboard' })
    );
  });

  it('should convert urls to base64 when structure contains image URLs', async () => {});
});
