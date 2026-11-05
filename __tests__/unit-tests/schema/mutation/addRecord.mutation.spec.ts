import { Form, Record, Resource, Version } from '@models';
import addRecord, { AddRecordArgs } from '@schema/mutation/addRecord.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { verifyTurnstileToken } from '@utils/captcha';
import { getNextId } from '@utils/form';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the captcha verification, so no call is made to Cloudflare
jest.mock('@utils/captcha', () => ({
  __esModule: true,
  verifyTurnstileToken: jest.fn(),
}));

// Mock getNextId only, as it relies on Redis
jest.mock('@utils/form/getNextId', () => ({
  getNextId: jest.fn(),
}));

describe('addRecord Resolver', () => {
  let context: Context;
  let args: AddRecordArgs;
  let databaseHelpers: DatabaseHelpers;
  let publicForm: Form;
  let privateForm: Form;
  let resourceForm: Form;
  let otherResourceForm: Form;
  let nextIdCounter = 0;
  const resource = new Types.ObjectId();
  const otherResource = new Types.ObjectId();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    publicForm = await Form.create({
      name: 'Public form',
      graphQLTypeName: 'PublicForm',
      isPublic: true,
      fields: [{ name: 'description', type: 'text' }],
    });
    privateForm = await Form.create({
      name: 'Private form',
      graphQLTypeName: 'PrivateForm',
      fields: [{ name: 'description', type: 'text' }],
    });
    resourceForm = await Form.create({
      name: 'Resource form',
      graphQLTypeName: 'ResourceForm',
      resource,
      fields: [{ name: 'description', type: 'text' }],
    });
    otherResourceForm = await Form.create({
      name: 'Other resource form',
      graphQLTypeName: 'OtherResourceForm',
      resource: otherResource,
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
        roles: [{ _id: new Types.ObjectId() }],
        positionAttributes: [],
        ability: { can: jest.fn().mockReturnValue(true) },
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;

    args = {
      form: privateForm.id,
      data: { description: 'test record' },
    };

    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
    });
    (verifyTurnstileToken as jest.Mock).mockResolvedValue(true);
    // Records have a unique index on incrementalId, so each call must
    // return a different id, as the real implementation does
    (getNextId as jest.Mock).mockImplementation(async () => {
      nextIdCounter += 1;
      return `2026-P${String(nextIdCounter).padStart(8, '0')}`;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authenticated user', () => {
    it('should create a record if the user has permission', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record).toBeInstanceOf(Record);
      expect(record.createdBy.user).toEqual(context.user._id);
      expect(record._createdBy.user.username).toEqual('test@user.com');
      expect(record.incrementalId).toMatch(/^2026-P\d{8}$/);
      expect(record.data.description).toEqual('test record');
    });

    it('should not require a captcha token', async () => {
      await addRecord.resolve(null, args, context);
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if the user does not have permission', async () => {
      (extendAbilityForRecords as jest.Mock).mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
        cannot: jest.fn().mockReturnValue(true),
      });
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });

    it('should throw an error if the form is not found', async () => {
      args.form = new Types.ObjectId().toHexString();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.dataNotFound'
      );
    });
  });

  describe('Draft record', () => {
    beforeEach(() => {
      args = { ...args, form: resourceForm.id, draft: true };
    });

    it('should store the draft without incremental id', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record.draft).toBe(true);
      expect(record.incrementalId).toBeUndefined();
      expect(getNextId).not.toHaveBeenCalled();
      // The field must be absent, not null, so the draft is excluded from the
      // partial unique index on incrementalId
      const stored = await Record.collection.findOne({ _id: record._id });
      expect(stored).not.toHaveProperty('incrementalId');
    });

    it('should allow several drafts on the same resource', async () => {
      const first = await addRecord.resolve(null, args, context);
      const second = await addRecord.resolve(null, args, context);
      expect(first.resource).toEqual(second.resource);
      expect(
        await Record.countDocuments({ resource, draft: true })
      ).toBeGreaterThanOrEqual(2);
    });

    it('should throw an error if the user is not logged', async () => {
      context.user = undefined;
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'common.errors.userNotLogged'
      );
    });
  });

  describe('Cloning a record', () => {
    let clonedRecord: Record;
    let clonedVersions: Version[];

    /**
     * Create a record with two versions, to clone from.
     *
     * @param form form of the record
     * @returns the created record
     */
    const createRecordWithHistory = async (form: Form) => {
      clonedVersions = await Version.create([
        { data: { description: 'v1' }, createdBy: new Types.ObjectId() },
        { data: { description: 'v2' }, createdBy: new Types.ObjectId() },
      ]);
      return Record.create({
        incrementalId: `2026-C${String(++nextIdCounter).padStart(8, '0')}`,
        form: form._id,
        _form: { _id: form._id, name: form.name },
        resource: form.resource,
        data: { description: 'cloned record' },
        versions: clonedVersions.map((x) => x._id),
      });
    };

    beforeEach(async () => {
      clonedRecord = await createRecordWithHistory(resourceForm);
      args = {
        form: resourceForm.id,
        data: { description: 'clone' },
        cloneRecordId: clonedRecord.id,
      };
    });

    it('should copy the history of the cloned record, plus its current data', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record.versions).toHaveLength(clonedVersions.length + 1);

      const versions = await Promise.all(
        record.versions.map((id: any) => Version.findById(id))
      );
      expect(versions.map((x) => x.data.description)).toEqual([
        'v1',
        'v2',
        'cloned record',
      ]);
    });

    it('should reuse the versions of the cloned record, without duplicating them', async () => {
      const versionsBefore = await Version.countDocuments();
      const record = await addRecord.resolve(null, args, context);
      clonedVersions.forEach((version, index) => {
        expect(version._id.equals(record.versions[index])).toBe(true);
      });
      // Only the version storing the data of the cloned record is created
      expect(await Version.countDocuments()).toEqual(versionsBefore + 1);
      // The cloned record keeps its own versions
      const source = await Record.findById(clonedRecord._id);
      expect(source.versions).toHaveLength(clonedVersions.length);
    });

    it('should keep the shared versions when one of the records is deleted', async () => {
      const record = await addRecord.resolve(null, args, context);
      await Record.deleteOne({ _id: record._id });
      // Versions still used by the cloned record are kept
      for (const version of clonedVersions) {
        expect(await Version.exists({ _id: version._id })).toBeTruthy();
      }
      // The version only used by the deleted record is removed
      const ownVersion = record.versions[record.versions.length - 1];
      expect(await Version.exists({ _id: ownVersion })).toBeNull();

      // Once no record uses them anymore, shared versions are removed
      await Record.deleteOne({ _id: clonedRecord._id });
      for (const version of clonedVersions) {
        expect(await Version.exists({ _id: version._id })).toBeNull();
      }
    });

    it('should clone a record of a form without resource', async () => {
      const recordToClone = await createRecordWithHistory(privateForm);
      args = {
        form: privateForm.id,
        data: { description: 'clone' },
        cloneRecordId: recordToClone.id,
      };
      const record = await addRecord.resolve(null, args, context);
      expect(record.versions).toHaveLength(clonedVersions.length + 1);
    });

    it('should throw an error if the id is not a valid record id', async () => {
      args.cloneRecordId = 'not-an-id';
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordId'
      );
    });

    it('should throw an error if the record does not exist', async () => {
      args.cloneRecordId = new Types.ObjectId().toHexString();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordResource'
      );
    });

    it('should throw an error if the record belongs to another resource', async () => {
      const recordToClone = await createRecordWithHistory(otherResourceForm);
      args.cloneRecordId = recordToClone.id;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'mutations.record.add.errors.invalidCloneRecordResource'
      );
    });

    it('should throw an error if the user cannot read the cloned record', async () => {
      (extendAbilityForRecords as jest.Mock)
        // Creation of the new record is allowed
        .mockResolvedValueOnce({
          can: jest.fn().mockReturnValue(true),
          cannot: jest.fn().mockReturnValue(false),
        })
        // But the cloned record cannot be read
        .mockResolvedValueOnce({
          can: jest.fn().mockReturnValue(false),
          cannot: jest.fn().mockReturnValue(true),
        });
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.permissionNotGranted'
      );
    });

    it('should throw an error if the user is not logged', async () => {
      context = { ...context, user: null } as unknown as Context;
      args.form = publicForm.id;
      args.captchaToken = 'captcha-token';
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
    });

    it('should not create any version if the record cannot be saved', async () => {
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValue(new Error('unexpected error'));
      const versionsBefore = await Version.countDocuments();
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(await Version.countDocuments()).toEqual(versionsBefore);
    });
  });

  describe('Submitting a draft', () => {
    let draft: Record;

    /**
     * Creates a draft on the resource form.
     *
     * @param overrides fields overriding the default draft ones
     * @returns the created draft
     */
    const createDraft = async (overrides: Partial<Record> = {}) =>
      Record.create({
        form: resourceForm._id,
        _form: { _id: resourceForm._id, name: resourceForm.name },
        resource,
        data: { description: 'draft' },
        draft: true,
        createdBy: { user: context.user._id },
        ...overrides,
      });

    beforeEach(async () => {
      draft = await createDraft();
      args = {
        form: resourceForm.id,
        data: { description: 'submitted' },
        draftId: draft.id,
      };
    });

    it('should insert a new submitted record and delete the draft', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record._id.equals(draft._id)).toBe(false);
      expect(record.draft).toBe(false);
      expect(record.incrementalId).toMatch(/^2026-P\d{8}$/);
      expect(record.data.description).toEqual('submitted');
      expect(await Record.exists({ _id: record._id })).toBeTruthy();
      expect(await Record.exists({ _id: draft._id })).toBeNull();
    });

    it('should accept a draft from another form of the same resource', async () => {
      const otherForm = await Form.create({
        name: 'Second resource form',
        graphQLTypeName: `SecondResourceForm${new Types.ObjectId()}`,
        resource,
        fields: [{ name: 'description', type: 'text' }],
      });
      args.form = otherForm.id;
      await addRecord.resolve(null, args, context);
      expect(await Record.exists({ _id: draft._id })).toBeNull();
    });

    it('should keep the versions the draft holds', async () => {
      const versions = await Version.create([
        { data: { description: 'v1' }, createdBy: new Types.ObjectId() },
      ]);
      draft = await createDraft({ versions: versions.map((x) => x._id) });
      args.draftId = draft.id;
      const record = await addRecord.resolve(null, args, context);
      expect(record.versions).toHaveLength(1);
      expect(versions[0]._id.equals(record.versions[0])).toBe(true);
      // The draft is deleted, but the version is still used by the record
      expect(await Version.exists({ _id: versions[0]._id })).toBeTruthy();
    });

    it('should only give one record when the draft is submitted twice', async () => {
      const description = `submitted twice ${draft.id}`;
      args.data = { description };
      const results = await Promise.allSettled([
        addRecord.resolve(null, args, context),
        addRecord.resolve(null, args, context),
      ]);
      expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(
        await Record.countDocuments({ 'data.description': description })
      ).toEqual(1);
      expect(await Record.exists({ _id: draft._id })).toBeNull();
    });

    it('should give the draft back if the record cannot be saved', async () => {
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValue(new Error('unexpected error'));
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      const stored = await Record.findById(draft._id);
      expect(stored.draft).toBe(true);
      expect(stored.data.description).toEqual('draft');
    });

    it('should keep the draft when the user is warned about a duplicate', async () => {
      const warningResource = await Resource.create({
        name: `Warning-${new Types.ObjectId()}`,
        fields: [{ name: 'org_code' }],
        uniquenessRules: [{ fields: ['org_code'], severity: 'warning' }],
      });
      const warningForm = await Form.create({
        name: 'Warning form',
        graphQLTypeName: `Warning${new Types.ObjectId()}`,
        resource: warningResource._id,
        fields: [{ name: 'org_code' }],
      });
      await Record.create({
        incrementalId: `2026-W${String(++nextIdCounter).padStart(8, '0')}`,
        form: warningForm._id,
        _form: { _id: warningForm._id, name: warningForm.name },
        resource: warningResource._id,
        data: { org_code: 'ABC' },
      });
      draft = await createDraft({
        form: warningForm._id,
        resource: warningResource._id,
        data: { org_code: 'ABC' },
      });
      args = {
        form: warningForm.id,
        data: { org_code: 'ABC' },
        draftId: draft.id,
      };
      const record: any = await addRecord.resolve(null, args, context);
      expect(record.validationErrors).toHaveLength(1);
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();

      // Once the user confirms, the record is submitted and the draft deleted
      await addRecord.resolve(null, { ...args, skipValidation: true }, context);
      expect(await Record.exists({ _id: draft._id })).toBeNull();
    });

    it('should keep the draft when the record is a duplicate', async () => {
      const uniqueResource = await Resource.create({
        name: `Unique-${new Types.ObjectId()}`,
        fields: [{ name: 'org_code' }],
        uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
      });
      const uniqueForm = await Form.create({
        name: 'Unique form',
        graphQLTypeName: `Unique${new Types.ObjectId()}`,
        resource: uniqueResource._id,
        fields: [{ name: 'org_code' }],
      });
      await Record.create({
        incrementalId: `2026-U${String(++nextIdCounter).padStart(8, '0')}`,
        form: uniqueForm._id,
        _form: { _id: uniqueForm._id, name: uniqueForm.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });
      draft = await createDraft({
        form: uniqueForm._id,
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });
      args = {
        form: uniqueForm.id,
        data: { org_code: 'ABC' },
        draftId: draft.id,
      };
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        GraphQLError
      );
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();
    });

    it('should throw an error if the draft belongs to another user', async () => {
      draft = await createDraft({
        createdBy: { user: new Types.ObjectId() },
      });
      args.draftId = draft.id;
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'mutations.record.add.errors.invalidDraftRecord'
      );
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();
    });

    it('should throw an error if the record is not a draft', async () => {
      const submitted = await Record.create({
        incrementalId: `2026-S${String(++nextIdCounter).padStart(8, '0')}`,
        form: resourceForm._id,
        _form: { _id: resourceForm._id, name: resourceForm.name },
        resource,
        data: { description: 'submitted record' },
        createdBy: { user: context.user._id },
      });
      args.draftId = submitted.id;
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'mutations.record.add.errors.invalidDraftRecord'
      );
      expect(await Record.exists({ _id: submitted._id })).toBeTruthy();
    });

    it('should throw an error if the draft belongs to another resource', async () => {
      args.form = otherResourceForm.id;
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'mutations.record.add.errors.invalidDraftRecord'
      );
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();
    });

    it('should throw an error if the draft id is not valid', async () => {
      args.draftId = 'not-an-id';
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'mutations.record.add.errors.invalidDraftRecord'
      );
    });

    it('should throw an error when saving a draft from a draft', async () => {
      args.draft = true;
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'mutations.record.add.errors.invalidDraftRecord'
      );
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();
    });

    it('should throw an error if the user is not logged', async () => {
      context = { ...context, user: null } as unknown as Context;
      args.form = publicForm.id;
      args.captchaToken = 'captcha-token';
      await expect(addRecord.resolve(null, args, context)).rejects.toThrow(
        'common.errors.userNotLogged'
      );
      expect(await Record.exists({ _id: draft._id })).toBeTruthy();
    });
  });

  describe('Nested drafts', () => {
    let parentForm: Form;
    let childForm: Form;

    /**
     * Creates a draft.
     *
     * @param form Form of the draft
     * @param data Data of the draft
     * @returns the created draft
     */
    const createDraft = async (form: Form, data: any) =>
      Record.create({
        form: form._id,
        _form: { _id: form._id, name: form.name },
        resource: form.resource,
        data,
        draft: true,
        createdBy: { user: context.user._id },
      });

    beforeAll(async () => {
      childForm = await Form.create({
        name: 'Nested child form',
        graphQLTypeName: 'NestedChildForm',
        resource: new Types.ObjectId(),
        fields: [
          { name: 'description', type: 'text' },
          { name: 'files', type: 'file' },
          { name: 'children', type: 'resources' },
        ],
      });
      parentForm = await Form.create({
        name: 'Nested parent form',
        graphQLTypeName: 'NestedParentForm',
        resource: new Types.ObjectId(),
        fields: [
          { name: 'description', type: 'text' },
          { name: 'files', type: 'file' },
          { name: 'children', type: 'resources' },
        ],
      });
    });

    it('should submit the drafts created from the record, whatever their depth', async () => {
      const grandchild = await createDraft(childForm, {
        files: [{ name: 'a.pdf', content: 'form/a', draft: true }],
      });
      const child = await createDraft(childForm, {
        children: [grandchild.id],
      });
      args = { form: parentForm.id, data: { children: [child.id] } };

      const record = await addRecord.resolve(null, args, context);

      expect(record.data.children).toEqual([child.id]);
      const nested = await Record.find({
        _id: { $in: [child._id, grandchild._id] },
      });
      expect(nested).toHaveLength(2);
      for (const nestedRecord of nested) {
        expect(nestedRecord.draft).toBe(false);
        expect(nestedRecord.incrementalId).toMatch(/^2026-P\d{8}$/);
      }
      expect((await Record.findById(grandchild._id)).data.files).toEqual([
        { name: 'a.pdf', content: 'form/a' },
      ]);
    });

    it('should submit the nested drafts of a submitted draft', async () => {
      const child = await createDraft(childForm, { description: 'child' });
      const draft = await createDraft(parentForm, { children: [child.id] });
      args = {
        form: parentForm.id,
        data: { children: [child.id] },
        draftId: draft.id,
      };

      await addRecord.resolve(null, args, context);

      expect((await Record.findById(child._id)).draft).toBe(false);
    });

    it('should leave the nested drafts of a draft as they are', async () => {
      const child = await createDraft(childForm, { description: 'child' });
      args = {
        form: parentForm.id,
        data: { children: [child.id] },
        draft: true,
      };

      await addRecord.resolve(null, args, context);

      expect((await Record.findById(child._id)).draft).toBe(true);
    });

    it('should not save the record if a nested draft cannot be submitted', async () => {
      const child = await createDraft(childForm, { description: 'child' });
      args = { form: parentForm.id, data: { children: [child.id] } };
      const parentsBefore = await Record.countDocuments({
        form: parentForm._id,
      });
      (extendAbilityForRecords as jest.Mock).mockImplementation(
        async (user, form) => {
          const granted = !childForm._id.equals(form._id);
          return { can: () => granted, cannot: () => !granted };
        }
      );

      const result = addRecord.resolve(null, args, context);

      await expect(result).rejects.toThrow(
        'common.errors.permissionNotGranted'
      );
      expect(await Record.countDocuments({ form: parentForm._id })).toEqual(
        parentsBefore
      );
      expect((await Record.findById(child._id)).draft).toBe(true);
    });

    it('should clear the draft flag of the files of a submitted record', async () => {
      args = {
        form: parentForm.id,
        data: { files: [{ name: 'a.pdf', content: 'form/a', draft: true }] },
      };

      const record = await addRecord.resolve(null, args, context);

      expect(record.data.files).toEqual([{ name: 'a.pdf', content: 'form/a' }]);
    });

    it('should keep the draft flag of the files of a draft', async () => {
      args = {
        form: parentForm.id,
        data: { files: [{ name: 'a.pdf', content: 'form/a', draft: true }] },
        draft: true,
      };

      const record = await addRecord.resolve(null, args, context);

      expect(record.data.files).toEqual([
        { name: 'a.pdf', content: 'form/a', draft: true },
      ]);
    });
  });

  describe('Unauthenticated user', () => {
    beforeEach(() => {
      context = { ...context, user: null } as unknown as Context;
      args = {
        form: publicForm.id,
        data: { description: 'public record' },
        captchaToken: 'captcha-token',
      };
    });

    it('should throw an error if the form is not public', async () => {
      args.form = privateForm.id;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.userNotLogged'
      );
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if no captcha token is provided', async () => {
      args.captchaToken = undefined;
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.invalidCaptcha'
      );
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('should throw an error if the captcha token is invalid', async () => {
      (verifyTurnstileToken as jest.Mock).mockResolvedValue(false);
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(verifyTurnstileToken).toHaveBeenCalledWith('captcha-token');
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.invalidCaptcha'
      );
    });

    it('should create a record on a public form with a valid captcha token', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record).toBeInstanceOf(Record);
      expect(verifyTurnstileToken).toHaveBeenCalledWith('captcha-token');
      expect(record.createdBy?.user).toBeUndefined();
      expect(record._createdBy?.user).toBeUndefined();
      expect(record.data.description).toEqual('public record');
    });

    it('should skip the ability check', async () => {
      await addRecord.resolve(null, args, context);
      expect(extendAbilityForRecords).not.toHaveBeenCalled();
    });
  });

  describe('Uniqueness rules', () => {
    let uniqueResource: Resource;
    let formWithResource: Form;

    beforeEach(async () => {
      uniqueResource = await Resource.create({
        name: `Organization-${new Types.ObjectId()}`,
        fields: [{ name: 'org_code' }],
        uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
      });
      formWithResource = await Form.create({
        name: 'Organization form',
        graphQLTypeName: `Organization${new Types.ObjectId()}`,
        resource: uniqueResource._id,
        fields: [{ name: 'org_code' }],
      });
      args = {
        form: formWithResource.id,
        data: { org_code: 'ABC' },
      };
    });

    it('throws a GraphQLError when an error-severity rule is violated', async () => {
      await Record.create({
        incrementalId: '1',
        form: formWithResource._id,
        _form: { _id: formWithResource._id, name: formWithResource.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });

      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      // The request did not fail: it must not be logged as an error
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('allows the record when the field value is not a duplicate', async () => {
      const record = await addRecord.resolve(null, args, context);
      expect(record).toBeInstanceOf(Record);
      expect(record.data.org_code).toEqual('ABC');
    });

    it('returns validationErrors without saving when a warning-severity rule is violated', async () => {
      uniqueResource.uniquenessRules = [
        { fields: ['org_code'], severity: 'warning' },
      ];
      await uniqueResource.save();
      await Record.create({
        incrementalId: '1',
        form: formWithResource._id,
        _form: { _id: formWithResource._id, name: formWithResource.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });

      const record: any = await addRecord.resolve(null, args, context);
      expect(record.validationErrors).toHaveLength(1);
      expect(record.validationErrors[0].severity).toEqual('warning');
      // Nothing is saved, so no incremental id must be used
      expect(getNextId).not.toHaveBeenCalled();
      const saved = await Record.findOne({
        resource: uniqueResource._id,
        'data.org_code': 'ABC',
      }).countDocuments();
      expect(saved).toEqual(1); // only the pre-existing one, nothing new saved
    });

    it('saves the record when skipValidation is set despite a warning-severity duplicate', async () => {
      uniqueResource.uniquenessRules = [
        { fields: ['org_code'], severity: 'warning' },
      ];
      await uniqueResource.save();
      await Record.create({
        incrementalId: '1',
        form: formWithResource._id,
        _form: { _id: formWithResource._id, name: formWithResource.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });
      args.skipValidation = true;

      await addRecord.resolve(null, args, context);
      const count = await Record.countDocuments({
        resource: uniqueResource._id,
        'data.org_code': 'ABC',
      });
      expect(count).toEqual(2);
    });

    it('saves the record of an unauthenticated user despite a warning-severity duplicate', async () => {
      uniqueResource.uniquenessRules = [
        { fields: ['org_code'], severity: 'warning' },
      ];
      await uniqueResource.save();
      await Form.updateOne({ _id: formWithResource._id }, { isPublic: true });
      await Record.create({
        incrementalId: '1',
        form: formWithResource._id,
        _form: { _id: formWithResource._id, name: formWithResource.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });
      context = { ...context, user: null } as unknown as Context;
      args.captchaToken = 'captcha-token';

      const record: any = await addRecord.resolve(null, args, context);
      expect(record.validationErrors).toBeUndefined();
      const count = await Record.countDocuments({
        resource: uniqueResource._id,
        'data.org_code': 'ABC',
      });
      expect(count).toEqual(2);
    });

    it('saves a draft with a duplicate value, without checking the rules', async () => {
      await Record.create({
        incrementalId: '1',
        form: formWithResource._id,
        _form: { _id: formWithResource._id, name: formWithResource.name },
        resource: uniqueResource._id,
        data: { org_code: 'ABC' },
      });
      args.draft = true;

      const record = await addRecord.resolve(null, args, context);
      expect(record.draft).toBe(true);
      expect(record.data.org_code).toEqual('ABC');
    });
  });

  describe('Error Handling', () => {
    it('should log the error and throw GraphQLError on unexpected errors', async () => {
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValue(new Error('unexpected error'));
      const result = addRecord.resolve(null, args, context);
      await expect(result).rejects.toThrow(GraphQLError);
      expect(logger.error).toHaveBeenCalled();
      expect(context.i18next.t).toHaveBeenCalledWith(
        'common.errors.internalServerError'
      );
    });
  });
});
