import { Form, Record, Resource } from '@models';
import editRecord, {
  EditRecordArgs,
} from '@schema/mutation/editRecord.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { checkRecordValidation, getNextId } from '@utils/form';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock getNextId, as it relies on Redis, and the survey validation
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
  getNextId: jest.fn(),
  checkRecordValidation: jest.fn(),
}));

/** Record returned when validation fails */
type RecordWithValidationErrors = Record & { validationErrors: unknown[] };

describe('editRecord Resolver', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let form: Form;
  let resource: Resource;
  let nextIdCounter = 0;

  /**
   * Builds mutation arguments, validation enabled.
   *
   * @param args Arguments to send
   * @returns Complete mutation arguments
   */
  const buildArgs = (
    args: Omit<EditRecordArgs, 'skipValidation'>
  ): EditRecordArgs => ({ skipValidation: false, ...args });

  /**
   * Creates a record of the test form.
   *
   * @param draft Whether the record is a draft
   * @returns the created record
   */
  const createRecord = async (draft: boolean) =>
    Record.create({
      ...(!draft && {
        incrementalId: `2026-R${String(++nextIdCounter).padStart(8, '0')}`,
      }),
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data: { description: 'initial' },
      draft,
      createdBy: { user: context.user._id },
    });

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    resource = await Resource.create({
      name: 'Edit record resource',
      fields: [{ name: 'description', type: 'text' }],
    });
    form = await Form.create({
      name: 'Edit record form',
      graphQLTypeName: 'EditRecordForm',
      resource: resource._id,
      core: true,
      structure: '{}',
      fields: [{ name: 'description', type: 'text' }],
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      user: {
        _id: new Types.ObjectId(),
        name: 'Test User',
        username: 'test@user.com',
        roles: [],
        positionAttributes: [],
        ability: { can: jest.fn().mockReturnValue(true) },
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;

    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });
    (getNextId as jest.Mock).mockImplementation(async () => {
      nextIdCounter += 1;
      return `2026-P${String(nextIdCounter).padStart(8, '0')}`;
    });
    (checkRecordValidation as jest.Mock).mockReturnValue([]);
  });

  describe('Draft records', () => {
    it('should save a draft without validation nor incremental id', async () => {
      const draft = await createRecord(true);
      const record = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { description: 'edited' } }),
        context
      );
      expect(record.draft).toBe(true);
      expect(record.incrementalId).toBeUndefined();
      expect(record.data.description).toEqual('edited');
      expect(checkRecordValidation).not.toHaveBeenCalled();
      expect(getNextId).not.toHaveBeenCalled();
    });

    it('should publish a draft, with validation and an incremental id', async () => {
      const draft = await createRecord(true);
      const record = await editRecord.resolve(
        null,
        buildArgs({
          id: draft.id,
          data: { description: 'published' },
          updateDraftStatus: false,
        }),
        context
      );
      expect(record.draft).toBe(false);
      expect(record.incrementalId).toMatch(/^2026-P\d{8}$/);
      expect(checkRecordValidation).toHaveBeenCalled();
    });

    it('should not publish a draft with validation errors', async () => {
      const draft = await createRecord(true);
      (checkRecordValidation as jest.Mock).mockReturnValue([
        { question: 'description', errors: ['Required'] },
      ]);
      const record = (await editRecord.resolve(
        null,
        buildArgs({
          id: draft.id,
          data: { description: '' },
          updateDraftStatus: false,
        }),
        context
      )) as RecordWithValidationErrors;
      expect(record.validationErrors).toHaveLength(1);
      const stored = await Record.findById(draft._id);
      expect(stored.draft).toBe(true);
      expect(stored.incrementalId).toBeUndefined();
    });

    it('should not turn a submitted record into a draft', async () => {
      const submitted = await createRecord(false);
      const result = editRecord.resolve(
        null,
        buildArgs({
          id: submitted.id,
          data: { description: 'demoted' },
          updateDraftStatus: true,
        }),
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.edit.errors.cannotDemoteToDraft'
      );
      const stored = await Record.findById(submitted._id);
      expect(stored.draft).toBe(false);
      expect(stored.data.description).toEqual('initial');
    });

    it('should keep editing a submitted record when no draft status is given', async () => {
      const submitted = await createRecord(false);
      const record = await editRecord.resolve(
        null,
        buildArgs({ id: submitted.id, data: { description: 'edited' } }),
        context
      );
      expect(record.draft).toBe(false);
      expect(record.incrementalId).toEqual(submitted.incrementalId);
      expect(record.data.description).toEqual('edited');
      expect(checkRecordValidation).toHaveBeenCalled();
    });
  });
});
