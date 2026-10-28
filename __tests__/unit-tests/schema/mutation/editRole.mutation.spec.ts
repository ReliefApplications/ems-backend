import { Types } from 'mongoose';
import { Permission, Role } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import resolver from '@schema/mutation/editRole.mutation';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@casl/mongoose', () => ({
  ...jest.requireActual('@casl/mongoose'),
  accessibleBy: jest.fn().mockReturnValue({ Role: {} }),
}));

/** Edited role */
const ROLE_ID = new Types.ObjectId();
/** Application of the edited role */
const APP_ID = new Types.ObjectId();
/** Application permission (can_see_users of an application) */
const APP_PERMISSION = new Types.ObjectId();
/** Back-office permission (can_see_roles, global) */
const GLOBAL_PERMISSION = new Types.ObjectId();

/**
 * Builds a request context whose translator echoes the i18n key.
 *
 * @returns mocked context
 */
const mockContext = (): any => ({
  i18next: { t: jest.fn((key: string) => key) },
  user: { _id: new Types.ObjectId(), ability: {} },
});

/**
 * Mocks the role lookups: the ability filter chain, and the edited role.
 *
 * @param role edited role, as found with the user's ability filter
 */
const mockRole = (role: any) => {
  (Role.find as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnValue({
      getFilter: jest.fn().mockReturnValue({ _id: ROLE_ID }),
    }),
  });
  (Role.findOne as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue(role),
  });
  (Role.findOneAndUpdate as jest.Mock).mockResolvedValue(role);
};

describe('Edit Role Mutation (C-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    // Only APP_PERMISSION is an application (non global) permission
    (Permission.countDocuments as jest.Mock).mockImplementation(
      async (filter: any) =>
        filter._id.$in.filter((id: string) => id === APP_PERMISSION.toString())
          .length
    );
  });

  it('refuses a back-office permission on an application role', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await expect(
      resolver.resolve(
        null,
        { id: ROLE_ID, permissions: [GLOBAL_PERMISSION] } as any,
        mockContext()
      )
    ).rejects.toThrow('mutations.role.edit.errors.globalPermissions');
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a mix of application and back-office permissions', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await expect(
      resolver.resolve(
        null,
        {
          id: ROLE_ID,
          permissions: [APP_PERMISSION, GLOBAL_PERMISSION],
        } as any,
        mockContext()
      )
    ).rejects.toThrow('mutations.role.edit.errors.globalPermissions');
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses unknown permission ids on an application role', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await expect(
      resolver.resolve(
        null,
        { id: ROLE_ID, permissions: [new Types.ObjectId()] } as any,
        mockContext()
      )
    ).rejects.toThrow('mutations.role.edit.errors.globalPermissions');
  });

  it('accepts application permissions on an application role', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await resolver.resolve(
      null,
      { id: ROLE_ID, permissions: [APP_PERMISSION] } as any,
      mockContext()
    );
    expect(Permission.countDocuments).toHaveBeenCalledWith({
      _id: { $in: [APP_PERMISSION.toString()] },
      global: { $ne: true },
    });
    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ROLE_ID },
      { permissions: [APP_PERMISSION] },
      { new: true }
    );
  });

  it('accepts an empty permission list on an application role', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await resolver.resolve(
      null,
      { id: ROLE_ID, permissions: [] } as any,
      mockContext()
    );
    expect(Permission.countDocuments).not.toHaveBeenCalled();
    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ROLE_ID },
      { permissions: [] },
      { new: true }
    );
  });

  it('still lets back-office permissions be set on back-office roles', async () => {
    mockRole({ _id: ROLE_ID, application: null });
    await resolver.resolve(
      null,
      { id: ROLE_ID, permissions: [GLOBAL_PERMISSION] } as any,
      mockContext()
    );
    expect(Permission.countDocuments).not.toHaveBeenCalled();
    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ROLE_ID },
      { permissions: [GLOBAL_PERMISSION] },
      { new: true }
    );
  });

  it('refuses to edit permissions of a role the user cannot update', async () => {
    mockRole(null);
    await expect(
      resolver.resolve(
        null,
        { id: ROLE_ID, permissions: [APP_PERMISSION] } as any,
        mockContext()
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(Role.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not look up permissions when only the title changes', async () => {
    mockRole({ _id: ROLE_ID, application: APP_ID });
    await resolver.resolve(
      null,
      { id: ROLE_ID, title: 'Renamed' } as any,
      mockContext()
    );
    expect(Role.findOne).not.toHaveBeenCalled();
    expect(Permission.countDocuments).not.toHaveBeenCalled();
    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ROLE_ID },
      { title: 'Renamed' },
      { new: true }
    );
  });
});
