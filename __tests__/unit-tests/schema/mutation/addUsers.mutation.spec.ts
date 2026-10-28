import { Types } from 'mongoose';
import { Application, Role, User } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import permissions from '@const/permissions';
import resolver from '@schema/mutation/addUsers.mutation';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@utils/user', () => ({
  ...jest.requireActual('@utils/user'),
  sendAppInvitation: jest.fn(),
  sendCreateAccountInvitation: jest.fn(),
}));
jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    get: jest.fn((key: string) =>
      key === 'email.sendInvite' ? false : actual.get(key)
    ),
    has: jest.fn((key: string) => actual.has(key)),
    util: actual.util,
  };
});

/** Managed application */
const APP_ID = new Types.ObjectId();
/** Role of the managed application */
const APP_ROLE = new Types.ObjectId();
/** Back-office administrator role */
const ADMIN_ROLE = new Types.ObjectId();

/**
 * Builds a request context for an application user manager (can_see_users on APP_ID only).
 *
 * @param canUpdateUsers whether the user also has the global update User ability
 * @returns mocked context
 */
const mockContext = (canUpdateUsers = false): any => ({
  i18next: { t: jest.fn((key: string) => key) },
  user: {
    _id: new Types.ObjectId(),
    roles: [
      {
        _id: new Types.ObjectId(),
        application: APP_ID,
        permissions: [{ type: permissions.canSeeUsers, global: false }],
      },
    ],
    ability: {
      cannot: jest.fn((action: string, subject: string) =>
        action === 'update' && subject === 'User' ? !canUpdateUsers : true
      ),
    },
  },
});

describe('Add Users Mutation (C-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    // Automocked models share the inherited `find`: dispatch on the filter.
    // Role lookups: only APP_ROLE belongs to APP_ID. User lookups: one registered user.
    (User.find as jest.Mock).mockImplementation((filter: any) => {
      if (filter._id) {
        return {
          select: jest
            .fn()
            .mockResolvedValue(
              filter._id.$in.includes(APP_ROLE.toString())
                ? [{ _id: APP_ROLE }]
                : []
            ),
        };
      }
      return {
        select: jest.fn().mockResolvedValue([{ username: 'existing@who.int' }]),
        populate: jest.fn().mockResolvedValue([]),
      };
    });
    (User.insertMany as jest.Mock).mockResolvedValue([]);
    (User.bulkWrite as jest.Mock).mockResolvedValue({});
    (Application.findById as jest.Mock).mockResolvedValue({ _id: APP_ID });
    (User as unknown as jest.Mock).mockImplementation(() => ({}));
  });

  it('refuses to invite a user with a back-office role', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          application: APP_ID,
          users: [{ email: 'new@who.int', role: ADMIN_ROLE }],
        } as any,
        context
      )
    ).rejects.toThrow('mutations.user.add.errors.invalidRoles');
    expect(User.insertMany).not.toHaveBeenCalled();
    expect(User.bulkWrite).not.toHaveBeenCalled();
  });

  it('refuses to add a back-office role to an existing user', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          application: APP_ID,
          users: [{ email: 'existing@who.int', role: ADMIN_ROLE }],
        } as any,
        context
      )
    ).rejects.toThrow('mutations.user.add.errors.invalidRoles');
    expect(User.bulkWrite).not.toHaveBeenCalled();
  });

  it('refuses the whole batch when one role is not an application role', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          application: APP_ID,
          users: [
            { email: 'new@who.int', role: APP_ROLE },
            { email: 'existing@who.int', role: ADMIN_ROLE },
          ],
        } as any,
        context
      )
    ).rejects.toThrow('mutations.user.add.errors.invalidRoles');
    expect(User.insertMany).not.toHaveBeenCalled();
    expect(User.bulkWrite).not.toHaveBeenCalled();
  });

  it('adds application roles to new and existing users', async () => {
    const context = mockContext();
    await resolver.resolve(
      null,
      {
        application: APP_ID,
        users: [
          { email: 'new@who.int', role: APP_ROLE },
          { email: 'existing@who.int', role: APP_ROLE },
        ],
      } as any,
      context
    );
    expect(Role.find).toHaveBeenCalledWith({
      _id: { $in: [APP_ROLE.toString()] },
      application: APP_ID,
    });
    expect(User.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ username: 'new@who.int', roles: [APP_ROLE] }),
    ]);
    expect(User.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { username: 'existing@who.int' },
          update: {
            $addToSet: { roles: APP_ROLE, positionAttributes: { $each: [] } },
          },
        },
      },
    ]);
  });

  it('refuses application user managers without an application', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        { users: [{ email: 'new@who.int', role: ADMIN_ROLE }] } as any,
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
  });

  it('still lets back-office administrators invite users with back-office roles', async () => {
    const context = mockContext(true);
    await resolver.resolve(
      null,
      { users: [{ email: 'new@who.int', role: ADMIN_ROLE }] } as any,
      context
    );
    expect(Role.find).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() })
    );
    expect(User.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ username: 'new@who.int', roles: [ADMIN_ROLE] }),
    ]);
  });
});
