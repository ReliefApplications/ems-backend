import { ResourceType } from '@schema/types';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';

describe('ResourceType rolePermissions', () => {
  const roleA = new Types.ObjectId();
  const roleB = new Types.ObjectId();
  const roleC = new Types.ObjectId();
  let context: Context;

  const resource: any = {
    permissions: {
      canSeeRecords: [{ role: roleA }, { role: roleB }],
      canCreateRecords: [{ role: roleC }],
      canUpdateRecords: [{ role: roleB }],
      fieldsAutoGrantCanSeeOptOut: [roleB],
      fieldsAutoGrantCanUpdateOptOut: [],
    },
  };

  /**
   * Resolve rolePermissions for the given role
   *
   * @param role role id
   * @returns resolved role permissions
   */
  const resolve = (role: Types.ObjectId) =>
    (ResourceType.getFields().rolePermissions as any).resolve(
      resource,
      { role: String(role) },
      context
    );

  beforeEach(() => {
    context = {
      user: {
        ability: {
          can: jest.fn().mockReturnValue(true),
          cannot: jest.fn().mockReturnValue(false),
        },
      },
    } as unknown as Context;
  });

  it('should report auto-grant as on for an eligible role', () => {
    const result = resolve(roleA);
    expect(result.autoGrantFieldsCanSee).toBe(true);
    expect(result.autoGrantFieldsCanUpdate).toBe(false);
  });

  it('should report auto-grant as off for a role that opted out', () => {
    const result = resolve(roleB);
    expect(result.autoGrantFieldsCanSee).toBe(false);
    expect(result.autoGrantFieldsCanUpdate).toBe(true);
  });

  it('should count create records access for both permissions', () => {
    const result = resolve(roleC);
    expect(result.autoGrantFieldsCanSee).toBe(true);
    expect(result.autoGrantFieldsCanUpdate).toBe(true);
  });

  it('should return null when the user cannot update the resource', () => {
    (context.user.ability.can as jest.Mock).mockReturnValue(false);
    expect(resolve(roleA)).toBeNull();
  });
});
