import extendAbilityForRecords from '@security/extendAbilityForRecords';
import getRecordsAbility, {
  clearRecordsAbilityCache,
} from '@utils/schema/resolvers/Query/getRecordsAbility';

jest.mock('@models');
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

/**
 * Builds a logged user.
 *
 * @param overrides user properties to override
 * @returns user
 */
const buildUser = (overrides: any = {}): any => ({
  _id: 'user-1',
  roles: [{ _id: 'role-1', permissions: [{ _id: 'permission-1' }] }],
  groups: [{ _id: 'group-1' }],
  attributes: { country: 'FR' },
  positionAttributes: [],
  ...overrides,
});

describe('getRecordsAbility', () => {
  let built = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    clearRecordsAbilityCache();
    built = 0;
    (extendAbilityForRecords as jest.Mock).mockImplementation(async () => ({
      id: ++built,
    }));
  });

  it('should reuse the cached ability for the same user and permissions', async () => {
    const context: any = {};
    const first = await getRecordsAbility(buildUser(), context);
    const second = await getRecordsAbility(buildUser(), {});

    expect(second).toEqual(first);
    expect(extendAbilityForRecords).toHaveBeenCalledTimes(1);
    expect(context.user.ability).toEqual(first);
  });

  it.each([
    ['a role is removed', { roles: [] }],
    [
      'a role permission changes',
      { roles: [{ _id: 'role-1', permissions: [] }] },
    ],
    ['a group changes', { groups: [{ _id: 'group-2' }] }],
    ['an attribute changes', { attributes: { country: 'UA' } }],
    [
      'a position attribute changes',
      { positionAttributes: [{ value: 'x', category: { _id: 'category-1' } }] },
    ],
  ])('should rebuild the ability when %s', async (_, overrides) => {
    const first = await getRecordsAbility(buildUser(), {});
    const second = await getRecordsAbility(buildUser(overrides), {});

    expect(second).not.toEqual(first);
    expect(extendAbilityForRecords).toHaveBeenCalledTimes(2);
  });

  it('should not share the cache between users', async () => {
    const first = await getRecordsAbility(buildUser(), {});
    const second = await getRecordsAbility(buildUser({ _id: 'user-2' }), {});

    expect(second).not.toEqual(first);
  });

  it('should rebuild the ability once the cache is cleared', async () => {
    const first = await getRecordsAbility(buildUser(), {});
    clearRecordsAbilityCache();
    const second = await getRecordsAbility(buildUser(), {});

    expect(second).not.toEqual(first);
    expect(extendAbilityForRecords).toHaveBeenCalledTimes(2);
  });
});
