import { Form, Record, Resource, Version } from '@models';
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

    it('should edit a draft in place, without creating a version', async () => {
      const draft = await createRecord(true);
      const versionsBefore = await Version.countDocuments();
      const record = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { description: 'auto-saved' } }),
        context
      );
      expect(record.versions).toHaveLength(0);
      expect(await Version.countDocuments()).toEqual(versionsBefore);
    });

    it('should start the history of a published draft from its publication', async () => {
      const draft = await createRecord(true);
      const versionsBefore = await Version.countDocuments();
      const published = await editRecord.resolve(
        null,
        buildArgs({
          id: draft.id,
          data: { description: 'published' },
          updateDraftStatus: false,
        }),
        context
      );
      expect(published.versions).toHaveLength(0);
      expect(await Version.countDocuments()).toEqual(versionsBefore);

      // Once published, edits are versioned as for any record
      const edited = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { description: 'edited' } }),
        context
      );
      expect(edited.versions).toHaveLength(1);
      expect(await Version.countDocuments()).toEqual(versionsBefore + 1);
      const version = await Version.findById(edited.versions[0]);
      expect(version.data.description).toEqual('published');
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

  describe('Uniqueness rules', () => {
    let uniqueResource: Resource;
    let uniqueForm: Form;
    let record: Record;

    /**
     * Creates a record of the form with uniqueness rules.
     *
     * @param orgCode Value of the unique field
     * @param draft Whether the record is a draft
     * @returns the created record
     */
    const createUniqueRecord = async (orgCode: string, draft = false) =>
      Record.create({
        ...(!draft && {
          incrementalId: `2026-U${String(++nextIdCounter).padStart(8, '0')}`,
        }),
        form: uniqueForm._id,
        _form: { _id: uniqueForm._id, name: uniqueForm.name },
        resource: uniqueResource._id,
        data: { org_code: orgCode },
        draft,
      });

    beforeEach(async () => {
      uniqueResource = await Resource.create({
        name: `Organization-${new Types.ObjectId()}`,
        fields: [{ name: 'org_code' }],
        uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
      });
      uniqueForm = await Form.create({
        name: 'Organization form',
        graphQLTypeName: `Organization${new Types.ObjectId()}`,
        resource: uniqueResource._id,
        core: true,
        fields: [{ name: 'org_code' }],
      });
      await createUniqueRecord('ABC');
      record = await createUniqueRecord('XYZ');
    });

    afterEach(async () => {
      await Record.deleteMany({ resource: uniqueResource._id });
      await Form.deleteMany({ _id: uniqueForm._id });
      await Resource.deleteMany({ _id: uniqueResource._id });
    });

    it('throws a GraphQLError when the new value collides with another record (error severity)', async () => {
      const result = editRecord.resolve(
        null,
        buildArgs({ id: record.id, data: { org_code: 'ABC' } }),
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
    });

    it('allows the update when the value is not a duplicate', async () => {
      const updated = await editRecord.resolve(
        null,
        buildArgs({ id: record.id, data: { org_code: 'NEW' } }),
        context
      );
      expect(updated.data.org_code).toEqual('NEW');
    });

    it('allows re-saving the record with its own unchanged value', async () => {
      const updated = await editRecord.resolve(
        null,
        buildArgs({ id: record.id, data: { org_code: 'XYZ' } }),
        context
      );
      expect(updated.data.org_code).toEqual('XYZ');
    });

    it('returns validationErrors without saving for a warning-severity duplicate', async () => {
      uniqueResource.uniquenessRules = [
        { fields: ['org_code'], severity: 'warning' },
      ];
      await uniqueResource.save();

      const updated = (await editRecord.resolve(
        null,
        buildArgs({ id: record.id, data: { org_code: 'ABC' } }),
        context
      )) as RecordWithValidationErrors;
      expect(updated.validationErrors).toHaveLength(1);
      const unchanged = await Record.findById(record.id);
      expect(unchanged.data.org_code).toEqual('XYZ');
    });

    it('saves the record when skipValidation is set despite a warning-severity duplicate', async () => {
      uniqueResource.uniquenessRules = [
        { fields: ['org_code'], severity: 'warning' },
      ];
      await uniqueResource.save();

      await editRecord.resolve(
        null,
        { id: record.id, data: { org_code: 'ABC' }, skipValidation: true },
        context
      );
      const updated = await Record.findById(record.id);
      expect(updated.data.org_code).toEqual('ABC');
    });

    it('should save a draft with a duplicate value, without checking the rules', async () => {
      const draft = await createUniqueRecord('DRAFT', true);
      const updated = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { org_code: 'ABC' } }),
        context
      );
      expect(updated.draft).toBe(true);
      expect(updated.data.org_code).toEqual('ABC');
    });

    it('should not publish a draft with a duplicate value', async () => {
      const draft = await createUniqueRecord('ABC', true);
      const result = editRecord.resolve(
        null,
        buildArgs({
          id: draft.id,
          data: { org_code: 'ABC' },
          updateDraftStatus: false,
        }),
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      const stored = await Record.findById(draft._id);
      expect(stored.draft).toBe(true);
    });
  });
});
