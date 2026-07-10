import { getOwnership } from '@utils/form/getOwnership';

describe('getOwnership', () => {
  const fields = [
    { name: 'status', type: 'text' },
    { name: 'assignedRoles', type: 'owner' },
  ];

  it('returns the roles from the owner field when filled', () => {
    const data = { status: 'open', assignedRoles: ['role1', 'role2'] };
    expect(getOwnership(fields, data)).toEqual({ roles: ['role1', 'role2'] });
  });

  it('returns null when the owner field is not filled', () => {
    expect(getOwnership(fields, { status: 'open' })).toBeNull();
  });

  it('returns null when the form has no owner field', () => {
    const noOwnerFields = [{ name: 'status', type: 'text' }];
    expect(getOwnership(noOwnerFields, { status: 'open' })).toBeNull();
  });
});
