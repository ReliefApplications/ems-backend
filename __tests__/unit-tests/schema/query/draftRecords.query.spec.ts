import { accessibleBy } from '@casl/mongoose';
import { Form, Record } from '@models';
import resolver from '@schema/query/draftRecords.query';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

jest.mock('@casl/mongoose', () => ({ accessibleBy: jest.fn() }));
jest.mock('@models', () => ({
  Form: {
    findById: jest.fn(),
  },
  Record: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('@schema/shared');
jest.mock('@security/extendAbilityForRecords');
jest.mock('@services/logger.service');

describe('DraftRecords Query Resolver', () => {
  const lean = jest.fn();
  const limit = jest.fn(() => ({ lean }));
  const skip = jest.fn(() => ({ limit }));
  const sort = jest.fn(() => ({ skip }));
  const select = jest.fn(() => ({ sort }));
  const abilityFilter = { permissions: 'allowed' };
  const ability = { cannot: jest.fn().mockReturnValue(false) };
  const form = { id: 'form-id' };
  const context = {
    user: { _id: 'user-id' },
    i18next: { t: (key: string) => key },
  } as unknown as Context;

  beforeEach(() => {
    jest.clearAllMocks();
    ability.cannot.mockReturnValue(false);
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => undefined);
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(ability);
    (accessibleBy as jest.Mock).mockReturnValue({ Record: abilityFilter });
    (Form.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(form),
    });
    (Record.find as jest.Mock).mockReturnValue({ select });
    (Record.countDocuments as jest.Mock).mockResolvedValue(12);
    lean.mockResolvedValue([
      {
        _id: { toString: () => 'draft-id' },
        createdAt: new Date('2026-10-01T10:00:00Z'),
        modifiedAt: new Date('2026-10-01T11:00:00Z'),
      },
    ]);
  });

  it('returns only projected summaries with own-draft and ability filters', async () => {
    const result = await resolver.resolve(
      null,
      {
        form: 'form-id',
        first: 10,
        skip: 0,
        sortField: 'modifiedAt',
        sortOrder: 'desc',
      },
      context
    );

    expect(graphQLAuthCheck).toHaveBeenCalledWith(context);
    expect(extendAbilityForRecords).toHaveBeenCalledWith(context.user, form);
    expect(Record.find).toHaveBeenCalledWith({
      ...abilityFilter,
      archived: { $ne: true },
      form: 'form-id',
      draft: true,
      'createdBy.user': 'user-id',
    });
    expect(Record.countDocuments).toHaveBeenCalledWith({
      ...abilityFilter,
      archived: { $ne: true },
      form: 'form-id',
      draft: true,
      'createdBy.user': 'user-id',
    });
    expect(select).toHaveBeenCalledWith('_id createdAt modifiedAt');
    expect(sort).toHaveBeenCalledWith({ modifiedAt: -1, _id: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      edges: [
        {
          cursor: 'ZHJhZnQtaWQ=',
          node: {
            id: 'draft-id',
            createdAt: new Date('2026-10-01T10:00:00Z'),
            modifiedAt: new Date('2026-10-01T11:00:00Z'),
          },
        },
      ],
      pageInfo: {
        hasNextPage: true,
        startCursor: 'ZHJhZnQtaWQ=',
        endCursor: 'ZHJhZnQtaWQ=',
      },
      totalCount: 12,
    });
  });

  it.each(['createdAt', 'modifiedAt'])(
    'supports sorting by %s',
    async (sortField) => {
      await resolver.resolve(
        null,
        { form: 'form-id', sortField, sortOrder: 'asc' },
        context
      );

      expect(sort).toHaveBeenCalledWith({ [sortField]: 1, _id: 1 });
    }
  );

  it('uses the established default page and sort settings', async () => {
    (Record.countDocuments as jest.Mock).mockResolvedValue(1);

    const result = await resolver.resolve(null, { form: 'form-id' }, context);

    expect(sort).toHaveBeenCalledWith({ modifiedAt: -1, _id: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('rejects missing forms before querying records', async () => {
    (Form.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(
      resolver.resolve(null, { form: 'missing-form' }, context)
    ).rejects.toThrow('common.errors.dataNotFound');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('rejects forms the user cannot read', async () => {
    ability.cannot.mockReturnValue(true);

    await expect(
      resolver.resolve(null, { form: 'form-id' }, context)
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('rejects unsupported sort fields before querying records', async () => {
    await expect(
      resolver.resolve(
        null,
        { form: 'form-id', sortField: 'data.title' },
        context
      )
    ).rejects.toThrow('Cannot sort by data.title field');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('rejects unsupported sort orders before querying records', async () => {
    await expect(
      resolver.resolve(
        null,
        { form: 'form-id', sortOrder: 'sideways' },
        context
      )
    ).rejects.toThrow('Cannot sort in sideways order');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('rejects invalid pagination before querying records', async () => {
    await expect(
      resolver.resolve(null, { form: 'form-id', skip: -1 }, context)
    ).rejects.toThrow('first must be positive and skip must be non-negative');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('does not expose drafts when the authenticated user has no identifier', async () => {
    const contextWithoutId = {
      ...context,
      user: {},
    } as unknown as Context;

    await expect(
      resolver.resolve(null, { form: 'form-id' }, contextWithoutId)
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(Record.find).not.toHaveBeenCalled();
  });

  it('turns persistence failures into the shared server error', async () => {
    lean.mockRejectedValue(new Error('database unavailable'));

    await expect(
      resolver.resolve(null, { form: 'form-id' }, context)
    ).rejects.toThrow('common.errors.internalServerError');
  });
});
