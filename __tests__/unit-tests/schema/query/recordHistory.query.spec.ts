import { Record, Form } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { graphQLAuthCheck } from '@schema/shared';
import { RecordHistory } from '@utils/history';
import resolver from '@schema/query/recordHistory.query';
import { GraphQLError } from 'graphql';

jest.mock('@models', () => {
  const mockRecordFindById = jest.fn();
  const mockFormFindById = jest.fn();
  const mockVersionFind = jest.fn();
  return {
    Record: {
      findById: mockRecordFindById,
    },
    Form: {
      findById: mockFormFindById,
    },
    Version: {
      find: mockVersionFind,
    },
  };
});
jest.mock('@security/extendAbilityForRecords');
jest.mock('@schema/shared');
jest.mock('@utils/history');
jest.mock('@services/logger.service');

describe('RecordHistory Query Resolver', () => {
  let context: any;
  let mockRecord: any;
  let mockForm: any;
  let mockGetHistory: any;

  beforeEach(() => {
    jest.resetAllMocks();
    
    context = {
      i18next: {
        t: jest.fn().mockImplementation((key) => key),
        i18n: {
          changeLanguage: jest.fn(),
          t: jest.fn().mockImplementation((key) => key),
        },
      },
      user: { id: 'userId' } as any,
    };

    mockRecord = { id: 'recordId', form: 'formId', versions: [] };
    mockForm = { id: 'formId' };
    mockGetHistory = jest.fn().mockResolvedValue([
      { changes: [{ type: 'add', field: 'name', old: null, new: 'value' }] },
    ]);

    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    
    (Record.findById as jest.Mock).mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockRecord),
    }));

    (Form.findById as jest.Mock).mockResolvedValue(mockForm);

    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      cannot: jest.fn().mockReturnValue(false),
    });

    (RecordHistory as any).mockImplementation(() => {
      return { getHistory: mockGetHistory };
    });
  });

  it('should throw error if record is not found', async () => {
    (Record.findById as jest.Mock).mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null),
    }));

    const args = { id: 'recordId' };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'common.errors.permissionNotGranted'
    );
  });

  it('should throw error if form is not found', async () => {
    (Form.findById as jest.Mock).mockResolvedValue(null);

    const args = { id: 'recordId' };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'common.errors.permissionNotGranted'
    );
  });

  it('should throw error if user has no read permission', async () => {
    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      cannot: jest.fn().mockReturnValue(true),
    });

    const args = { id: 'recordId' };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      'common.errors.permissionNotGranted'
    );
  });

  it('should fetch history with pagination, fields and date range parameters', async () => {
    const fromDate = new Date('2026-07-01T00:00:00Z');
    const toDate = new Date('2026-07-05T00:00:00Z');
    const args = {
      id: 'recordId',
      first: 10,
      skip: 20,
      fields: ['name'],
      fromDate,
      toDate,
    };
    const result = await resolver.resolve(null, args, context);

    expect(RecordHistory).toHaveBeenCalledWith(mockRecord, expect.any(Object));
    expect(mockGetHistory).toHaveBeenCalledWith({
      skip: 20,
      limit: 10,
      fields: ['name'],
      fromDate,
      toDate,
    });
    expect(result).toBeDefined();
  });

  it('should fetch history without pagination if no first or skip is provided', async () => {
    const args = { id: 'recordId' };
    const result = await resolver.resolve(null, args, context);

    expect(RecordHistory).toHaveBeenCalledWith(mockRecord, expect.any(Object));
    expect(mockGetHistory).toHaveBeenCalledWith({
      skip: undefined,
      limit: undefined,
      fields: undefined,
    });
    expect(result).toBeDefined();
  });

  it('should throw an error if the requested page size is too large', async () => {
    const args = { id: 'recordId', first: 5000 };
    await expect(resolver.resolve(null, args, context)).rejects.toThrow(
      GraphQLError
    );
    expect(mockGetHistory).not.toHaveBeenCalled();
  });
});
