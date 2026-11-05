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
import { logger } from '@services/logger.service';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock getNextId, as it relies on Redis
jest.mock('@utils/form/getNextId', () => ({
  getNextId: jest.fn(),
}));

// Mock the survey validation
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
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

    it('should let the author edit a draft with the permission to add records only', async () => {
      (extendAbilityForRecords as jest.Mock).mockResolvedValue({
        can: jest.fn((action: string) => action === 'create'),
        cannot: jest.fn((action: string) => action !== 'create'),
      });
      const draft = await createRecord(true);
      const record = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { description: 'edited' } }),
        context
      );
      expect(record.data.description).toEqual('edited');
    });

    it('should not edit a draft without the permission to add records', async () => {
      (extendAbilityForRecords as jest.Mock).mockResolvedValue({
        can: jest.fn((action: string) => action === 'update'),
        cannot: jest.fn((action: string) => action !== 'update'),
      });
      const draft = await createRecord(true);
      await expect(
        editRecord.resolve(
          null,
          buildArgs({ id: draft.id, data: { description: 'edited' } }),
          context
        )
      ).rejects.toThrow('common.errors.permissionNotGranted');
      const stored = await Record.findById(draft._id);
      expect(stored.data.description).toEqual('initial');
    });

    it('should not edit the draft of another user', async () => {
      const draft = await createRecord(true);
      await Record.updateOne(
        { _id: draft._id },
        { 'createdBy.user': new Types.ObjectId() }
      );
      await expect(
        editRecord.resolve(
          null,
          buildArgs({ id: draft.id, data: { description: 'edited' } }),
          context
        )
      ).rejects.toThrow('common.errors.permissionNotGranted');
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

  describe('Nested drafts', () => {
    let parentForm: Form;
    let parentResource: Resource;

    /**
     * Creates a record of the parent form.
     *
     * @param draft Whether the record is a draft
     * @returns the created record
     */
    const createParent = async (draft: boolean) =>
      Record.create({
        ...(!draft && {
          incrementalId: `2026-R${String(++nextIdCounter).padStart(8, '0')}`,
        }),
        form: parentForm._id,
        _form: { _id: parentForm._id, name: parentForm.name },
        resource: parentResource._id,
        data: {},
        draft,
        createdBy: { user: context.user._id },
      });

    beforeAll(async () => {
      const fields = [
        { name: 'children', type: 'resources' },
        { name: 'files', type: 'file' },
      ];
      parentResource = await Resource.create({
        name: 'Edit record parent resource',
        fields,
      });
      parentForm = await Form.create({
        name: 'Edit record parent form',
        graphQLTypeName: 'EditRecordParentForm',
        resource: parentResource._id,
        core: true,
        structure: '{}',
        fields,
      });
    });

    it('should submit the drafts created from a submitted record', async () => {
      const child = await createRecord(true);
      const parent = await createParent(false);

      const record = await editRecord.resolve(
        null,
        buildArgs({ id: parent.id, data: { children: [child.id] } }),
        context
      );

      expect(record.data.children).toEqual([child.id]);
      const submitted = await Record.findById(child._id);
      expect(submitted.draft).toBe(false);
      expect(submitted.incrementalId).toMatch(/^2026-P\d{8}$/);
    });

    it('should submit the drafts a submitted record references already', async () => {
      const child = await createRecord(true);
      const parent = await createParent(false);
      await Record.updateOne(
        { _id: parent._id },
        { data: { children: [child.id] } }
      );

      await editRecord.resolve(
        null,
        buildArgs({ id: parent.id, data: { files: [] } }),
        context
      );

      expect((await Record.findById(child._id)).draft).toBe(false);
    });

    it('should leave the nested drafts of a draft as they are', async () => {
      const child = await createRecord(true);
      const parent = await createParent(true);

      await editRecord.resolve(
        null,
        buildArgs({ id: parent.id, data: { children: [child.id] } }),
        context
      );

      expect((await Record.findById(child._id)).draft).toBe(true);
      expect(getNextId).not.toHaveBeenCalled();
    });

    it('should leave the nested drafts as they are when the record is not saved', async () => {
      (checkRecordValidation as jest.Mock).mockReturnValue([
        { question: 'children', errors: ['Invalid'] },
      ]);
      const child = await createRecord(true);
      const parent = await createParent(false);

      await editRecord.resolve(
        null,
        buildArgs({ id: parent.id, data: { children: [child.id] } }),
        context
      );

      expect((await Record.findById(child._id)).draft).toBe(true);
    });

    it('should only keep the draft flag of the files of a draft', async () => {
      const files = [{ name: 'a.pdf', content: 'form/a', draft: true }];
      const draft = await createParent(true);
      const submitted = await createParent(false);

      const editedDraft = await editRecord.resolve(
        null,
        buildArgs({ id: draft.id, data: { files } }),
        context
      );
      const editedRecord = await editRecord.resolve(
        null,
        buildArgs({ id: submitted.id, data: { files } }),
        context
      );

      expect(editedDraft.data.files).toEqual(files);
      expect(editedRecord.data.files).toEqual([
        { name: 'a.pdf', content: 'form/a' },
      ]);
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
        createdBy: { user: context.user._id },
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
      // The request did not fail: it must not be logged as an error
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
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

    it('detects a duplicate on a date field, sent as text by the client', async () => {
      const fields = [
        { name: 'name', type: 'text' },
        { name: 'dob', type: 'date' },
      ];
      uniqueResource.fields = fields;
      uniqueResource.uniquenessRules = [
        { fields: ['name', 'dob'], severity: 'error' },
      ];
      await uniqueResource.save();
      await Form.updateOne({ _id: uniqueForm._id }, { fields });
      const createPerson = (name: string) =>
        Record.create({
          incrementalId: `2026-U${String(++nextIdCounter).padStart(8, '0')}`,
          form: uniqueForm._id,
          _form: { _id: uniqueForm._id, name: uniqueForm.name },
          resource: uniqueResource._id,
          // Dates are stored as dates, not as the text sent by the client
          data: { name, dob: new Date('1990-05-01') },
        });
      await createPerson('John');
      const jane = await createPerson('Jane');

      const result = editRecord.resolve(
        null,
        buildArgs({ id: jane.id, data: { name: 'John', dob: '1990-05-01' } }),
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      const stored = await Record.findById(jane._id);
      expect(stored.data.name).toEqual('Jane');
    });

    it('should not revert to a version duplicating another record', async () => {
      const version = await Version.create({
        data: { org_code: 'ABC' },
        createdBy: context.user._id,
      });
      await Record.updateOne(
        { _id: record._id },
        { $push: { versions: version._id } }
      );

      const result = editRecord.resolve(
        null,
        buildArgs({ id: record.id, version: version.id }),
        context
      );
      await expect(result).rejects.toThrow(GraphQLError);
      const stored = await Record.findById(record._id);
      expect(stored.data.org_code).toEqual('XYZ');
    });

    it('should revert to a version which is not a duplicate', async () => {
      const version = await Version.create({
        data: { org_code: 'OLD' },
        createdBy: context.user._id,
      });
      await Record.updateOne(
        { _id: record._id },
        { $push: { versions: version._id } }
      );

      const reverted = await editRecord.resolve(
        null,
        buildArgs({ id: record.id, version: version.id }),
        context
      );
      expect(reverted.data.org_code).toEqual('OLD');
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
  });
});
