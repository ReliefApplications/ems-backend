import { GraphQLError } from 'graphql';
import { Form, Record } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import single from '@utils/schema/resolvers/Query/single';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@security/extendAbilityForRecords');
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
  user: { id: 'userId', ability: {} },
});

/** Record id used across the suite */
const RECORD_ID = '507f1f77bcf86cd799439011';

describe('Single entity resolver (dynamic <FormType>(id) query)', () => {
  const resolver = single();
  let record: any;
  let form: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    record = {
      _id: RECORD_ID,
      form: 'formId',
      data: { name: 'Alice', secret: 'hidden' },
    };
    form = { _id: 'formId' };
    (Record.findOne as jest.Mock).mockResolvedValue(record);
    (Form.findById as jest.Mock).mockResolvedValue(form);
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

  it('denies reading a record the user has no read ability on', async () => {
    const context = mockContext();
    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      cannot: jest.fn().mockReturnValue(true),
    });
    await expect(resolver(null, { id: RECORD_ID }, context)).rejects.toThrow(
      'common.errors.permissionNotGranted'
    );
    expect(extendAbilityForRecords).toHaveBeenCalledWith(context.user, form);
    expect(getAccessibleFields).not.toHaveBeenCalled();
  });

  it('extends the ability with the record form and checks read on the record', async () => {
    const context = mockContext();
    const cannot = jest.fn().mockReturnValue(false);
    (extendAbilityForRecords as jest.Mock).mockResolvedValue({ cannot });
    await resolver(null, { id: RECORD_ID }, context);
    expect(Record.findOne).toHaveBeenCalledWith({
      _id: RECORD_ID,
      archived: { $ne: true },
    });
    expect(Form.findById).toHaveBeenCalledWith('formId');
    expect(extendAbilityForRecords).toHaveBeenCalledWith(context.user, form);
    expect(cannot).toHaveBeenCalledWith('read', record);
  });

  it('returns only the fields the user can read', async () => {
    const ability = { cannot: jest.fn().mockReturnValue(false) };
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(ability);
    (getAccessibleFields as jest.Mock).mockImplementation((r) => ({
      ...r,
      data: { name: r.data.name },
    }));
    const result = await resolver(null, { id: RECORD_ID }, mockContext());
    expect(getAccessibleFields).toHaveBeenCalledWith(record, ability);
    expect(result.data).toEqual({ name: 'Alice' });
  });

  it('applies the data override before filtering fields', async () => {
    const ability = { cannot: jest.fn().mockReturnValue(false) };
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(ability);
    const data = { name: 'Bob' };
    await resolver(null, { id: RECORD_ID, data }, mockContext());
    expect(getAccessibleFields).toHaveBeenCalledWith(
      expect.objectContaining({ data }),
      ability
    );
  });

  it('returns null when the record does not exist or is archived', async () => {
    (Record.findOne as jest.Mock).mockResolvedValue(null);
    const result = await resolver(null, { id: RECORD_ID }, mockContext());
    expect(result).toBeNull();
    expect(extendAbilityForRecords).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind a generic message', async () => {
    (Record.findOne as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(
      resolver(null, { id: RECORD_ID }, mockContext())
    ).rejects.toThrow('common.errors.internalServerError');
  });
});
