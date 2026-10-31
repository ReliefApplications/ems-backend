import { Types } from 'mongoose';
import { Role, User } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import permissions from '@const/permissions';
import resolver from '@schema/mutation/editUser.mutation';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');

/** Managed application */
const APP_ID = new Types.ObjectId();
/** Role of the managed application */
const APP_ROLE = new Types.ObjectId();
/** Another role of the managed application */
const OTHER_APP_ROLE = new Types.ObjectId();
/** Back-office administrator role */
const ADMIN_ROLE = new Types.ObjectId();
/** Edited user */
const USER_ID = new Types.ObjectId();

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

/**
 * Mocks `Role.find().select()` so that only the given ids are roles of APP_ID.
 *
 * @param appRoleIds ids of the roles attached to APP_ID
 */
const mockAppRoles = (appRoleIds: Types.ObjectId[]) => {
  (Role.find as jest.Mock).mockImplementation((filter: any) => ({
    select: jest
      .fn()
      .mockResolvedValue(
        appRoleIds
          .filter((id) => filter._id.$in.includes(id.toString()))
          .map((id) => ({ _id: id }))
      ),
  }));
};

describe('Edit User Mutation (C-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    mockAppRoles([APP_ROLE, OTHER_APP_ROLE]);
    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: USER_ID,
        roles: [{ _id: ADMIN_ROLE }], // roles kept because not attached to the application
      }),
    });
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: USER_ID });
  });

  it('refuses a back-office role given by an application user manager', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        { id: USER_ID, application: APP_ID, roles: [ADMIN_ROLE] } as any,
        context
      )
    ).rejects.toThrow('mutations.user.edit.errors.invalidRoles');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a mix of application roles and a back-office role', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          id: USER_ID,
          application: APP_ID,
          roles: [APP_ROLE, ADMIN_ROLE],
        } as any,
        context
      )
    ).rejects.toThrow('mutations.user.edit.errors.invalidRoles');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a role of another application', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          id: USER_ID,
          application: APP_ID,
          roles: [new Types.ObjectId()],
        } as any,
        context
      )
    ).rejects.toThrow('mutations.user.edit.errors.invalidRoles');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('replaces the application roles with valid ones, keeping the other roles', async () => {
    const context = mockContext();
    await resolver.resolve(
      null,
      {
        id: USER_ID,
        application: APP_ID,
        roles: [APP_ROLE, OTHER_APP_ROLE],
      } as any,
      context
    );
    expect(Role.find).toHaveBeenCalledWith({
      _id: { $in: [APP_ROLE.toString(), OTHER_APP_ROLE.toString()] },
      application: APP_ID,
    });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      { roles: [ADMIN_ROLE, APP_ROLE, OTHER_APP_ROLE] },
      { new: true }
    );
  });

  it('removes every application role when an empty list is given', async () => {
    const context = mockContext();
    await resolver.resolve(
      null,
      { id: USER_ID, application: APP_ID, roles: [] } as any,
      context
    );
    expect(Role.find).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      { roles: [ADMIN_ROLE] },
      { new: true }
    );
  });

  it('applies the same check to back-office users editing application roles', async () => {
    const context = mockContext(true);
    await expect(
      resolver.resolve(
        null,
        { id: USER_ID, application: APP_ID, roles: [ADMIN_ROLE] } as any,
        context
      )
    ).rejects.toThrow('mutations.user.edit.errors.invalidRoles');
  });

  it('refuses application user managers of another application', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          id: USER_ID,
          application: new Types.ObjectId(),
          roles: [APP_ROLE],
        } as any,
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(Role.find).not.toHaveBeenCalled();
  });

  it('leaves roles untouched when only position attributes are edited', async () => {
    const context = mockContext();
    await resolver.resolve(
      null,
      {
        id: USER_ID,
        application: APP_ID,
        positionAttributes: [{ value: 'FR', category: 'country' }],
      } as any,
      context
    );
    expect(Role.find).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      { positionAttributes: [{ value: 'FR', category: 'country' }] },
      { new: true }
    );
  });

  it('returns not found when the edited user does not exist', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        { id: USER_ID, application: APP_ID, roles: [APP_ROLE] } as any,
        context
      )
    ).rejects.toThrow('common.errors.dataNotFound');
  });

  it('still lets back-office administrators set back-office roles without an application', async () => {
    const context = mockContext(true);
    (User.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: USER_ID,
        roles: [{ _id: APP_ROLE }], // application roles kept
      }),
    });
    await resolver.resolve(
      null,
      { id: USER_ID, roles: [ADMIN_ROLE] } as any,
      context
    );
    expect(Role.find).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      { roles: [APP_ROLE, ADMIN_ROLE] },
      { new: true }
    );
  });
});
