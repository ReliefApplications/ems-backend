import { GraphQLError } from 'graphql';
import { accessibleBy } from '@casl/mongoose';
import { Record } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { getDraftRecordFilter } from '@utils/filter';
import { getAccessibleFields } from '@utils/form';
import getRecordsAbility from '@utils/schema/resolvers/Query/getRecordsAbility';
import single from '@utils/schema/resolvers/Query/single';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@casl/mongoose', () => ({
  ...jest.requireActual('@casl/mongoose'),
  accessibleBy: jest.fn(),
}));
jest.mock('@utils/schema/resolvers/Query/getRecordsAbility', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@utils/filter', () => ({
  getDraftRecordFilter: jest.fn(() => ({})),
}));
jest.mock('@utils/form', () => ({
  getAccessibleFields: jest.fn(),
}));

/**
 * Builds a request context whose translator echoes the i18n key.
 *
 * @returns mocked context
 */
const mockContext = (): any => ({
  i18next: { t: jest.fn((key: string) => key) },
  user: { _id: 'userId', ability: {} },
});

/** Record id used across the suite */
const RECORD_ID = '507f1f77bcf86cd799439011';
/** Mongo filter derived from the user ability on records */
const PERMISSION_FILTER = { form: { $in: ['formId'] } };

describe('Single entity resolver (dynamic <FormType>(id) query)', () => {
  const resolver = single();
  const ability: any = { rules: [] };
  let record: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    record = {
      _id: RECORD_ID,
      form: 'formId',
      data: { name: 'Alice', secret: 'hidden' },
    };
    (getRecordsAbility as jest.Mock).mockResolvedValue(ability);
    (accessibleBy as jest.Mock).mockReturnValue({ Record: { accessible: true } });
    (Record.find as jest.Mock).mockReturnValue({
      getFilter: () => PERMISSION_FILTER,
    });
    (Record.findOne as jest.Mock).mockResolvedValue(record);
    (getAccessibleFields as jest.Mock).mockImplementation((r) => r);
  });

  it('rejects unauthenticated users before touching the database', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {
      throw new GraphQLError('common.errors.userNotLogged');
    });
    await expect(
      resolver(null, { id: RECORD_ID }, mockContext())
    ).rejects.toThrow('common.errors.userNotLogged');
    expect(Record.findOne).not.toHaveBeenCalled();
  });

  it('applies the user ability on records as a read filter', async () => {
    const context = mockContext();
    await resolver(null, { id: RECORD_ID }, context);
    expect(getRecordsAbility).toHaveBeenCalledWith(context.user, context);
    expect(accessibleBy).toHaveBeenCalledWith(ability, 'read');
    expect(Record.find).toHaveBeenCalledWith({ accessible: true });
    expect(getDraftRecordFilter).toHaveBeenCalledWith(
      { recordVisibility: undefined },
      context.user
    );
    expect(Record.findOne).toHaveBeenCalledWith({
      $and: [{ _id: RECORD_ID, archived: { $ne: true } }, PERMISSION_FILTER],
    });
  });

  it('returns null, without filtering fields, when no readable record matches', async () => {
    (Record.findOne as jest.Mock).mockResolvedValue(null);
    const result = await resolver(null, { id: RECORD_ID }, mockContext());
    expect(result).toBeNull();
    expect(getAccessibleFields).not.toHaveBeenCalled();
  });

  it('filters draft records according to the requested visibility', async () => {
    const context = mockContext();
    (getDraftRecordFilter as jest.Mock).mockReturnValueOnce({ draft: true });
    await resolver(
      null,
      { id: RECORD_ID, recordVisibility: 'allDrafts' },
      context
    );
    expect(getDraftRecordFilter).toHaveBeenCalledWith(
      { recordVisibility: 'allDrafts' },
      context.user
    );
    expect(Record.findOne).toHaveBeenCalledWith({
      $and: [
        { _id: RECORD_ID, archived: { $ne: true }, draft: true },
        PERMISSION_FILTER,
      ],
    });
  });

  it('returns only the fields the user can read', async () => {
    (getAccessibleFields as jest.Mock).mockImplementation((r) => {
      delete r.data.secret;
      return r;
    });
    const result = await resolver(null, { id: RECORD_ID }, mockContext());
    expect(getAccessibleFields).toHaveBeenCalledWith(record, ability);
    expect(result.data).toEqual({ name: 'Alice' });
  });

  it('overrides the record data with the given data', async () => {
    const data = { name: 'Bob' };
    const result = await resolver(null, { id: RECORD_ID, data }, mockContext());
    expect(result.data).toEqual(data);
  });

  it('hides unexpected errors behind a generic message', async () => {
    (Record.findOne as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(
      resolver(null, { id: RECORD_ID }, mockContext())
    ).rejects.toThrow('common.errors.internalServerError');
  });
});
