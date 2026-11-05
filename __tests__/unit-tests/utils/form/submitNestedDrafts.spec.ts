import { Form, Record, Resource, Version } from '@models';
import {
  clearDraftFiles,
  getNestedDrafts,
  getNextId,
  submitNestedDrafts,
  UniquenessError,
} from '@utils/form';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
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

describe('submitNestedDrafts', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let parentForm: Form;
  let childForm: Form;
  let grandchildForm: Form;
  let childResource: Resource;
  let nextIdCounter = 0;

  /**
   * Creates a record.
   *
   * @param form Form of the record
   * @param data Data of the record
   * @param options Options
   * @param options.draft Whether the record is a draft, true by default
   * @param options.user Author of the record, the current user by default
   * @returns the created record
   */
  const createRecord = async (
    form: Form,
    data: any,
    options: { draft?: boolean; user?: Types.ObjectId } = {}
  ) => {
    const draft = options.draft ?? true;
    return Record.create({
      ...(!draft && {
        incrementalId: `2026-S${String(++nextIdCounter).padStart(8, '0')}`,
      }),
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: form.resource,
      data,
      draft,
      createdBy: { user: options.user ?? context.user._id },
    });
  };

  /**
   * Submits the drafts referenced by a record of the parent form.
   *
   * @param data Data of the record
   */
  const submit = async (data: any) =>
    submitNestedDrafts(await getNestedDrafts(data, parentForm.fields, context));

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    childResource = await Resource.create({
      name: 'Nested drafts child resource',
      fields: [{ name: 'name', type: 'text' }],
      uniquenessRules: [{ fields: ['name'], severity: 'error' }],
    });
    grandchildForm = await Form.create({
      name: 'Grandchild form',
      graphQLTypeName: 'NestedDraftsGrandchildForm',
      resource: new Types.ObjectId(),
      fields: [
        { name: 'name', type: 'text' },
        { name: 'files', type: 'file' },
        { name: 'parents', type: 'resources' },
      ],
    });
    childForm = await Form.create({
      name: 'Child form',
      graphQLTypeName: 'NestedDraftsChildForm',
      resource: childResource._id,
      fields: [
        { name: 'name', type: 'text' },
        { name: 'files', type: 'file' },
        { name: 'grandchildren', type: 'resources' },
      ],
    });
    parentForm = await Form.create({
      name: 'Parent form',
      graphQLTypeName: 'NestedDraftsParentForm',
      resource: new Types.ObjectId(),
      fields: [
        { name: 'name', type: 'text' },
        { name: 'child', type: 'resource' },
        { name: 'children', type: 'resources' },
      ],
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
      return `2026-S${String(nextIdCounter).padStart(8, '0')}`;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('clearDraftFiles', () => {
    it('should remove the draft flag of the files, and nothing else', () => {
      const data = {
        name: 'record',
        files: [
          { name: 'a.pdf', content: 'form/a', draft: true, lang: 'en' },
          { name: 'b.pdf', content: { driveId: 'drive', itemId: 'item' } },
        ],
        // Not a file question
        child: [{ name: 'c.pdf', content: 'form/c', draft: true }],
      };
      clearDraftFiles(data, childForm.fields);
      expect(data.files).toEqual([
        { name: 'a.pdf', content: 'form/a', lang: 'en' },
        { name: 'b.pdf', content: { driveId: 'drive', itemId: 'item' } },
      ]);
      expect(data.child[0].draft).toBe(true);
    });

    it('should ignore empty file questions', () => {
      expect(clearDraftFiles({ files: null }, childForm.fields)).toEqual({
        files: null,
      });
    });
  });

  describe('Submitting the drafts', () => {
    it('should submit the drafts of resource and resources questions', async () => {
      const single = await createRecord(childForm, { name: 'single' });
      const first = await createRecord(childForm, { name: 'first' });
      const second = await createRecord(childForm, { name: 'second' });

      await submit({ child: single.id, children: [first.id, second.id] });

      const records = await Record.find({
        _id: { $in: [single._id, first._id, second._id] },
      });
      expect(records).toHaveLength(3);
      for (const record of records) {
        expect(record.draft).toBe(false);
        expect(record.incrementalId).toMatch(/^2026-S\d{8}$/);
      }
      expect(getNextId).toHaveBeenCalledWith(String(childResource._id));
    });

    it('should keep the id, the data and the author of the draft', async () => {
      const draft = await createRecord(childForm, { name: 'kept' });

      await submit({ child: draft.id });

      const record = await Record.findById(draft._id);
      expect(record.data).toEqual({ name: 'kept' });
      expect(String(record.createdBy.user)).toEqual(String(context.user._id));
      expect(String(record.form)).toEqual(childForm.id);
      expect(String(record.resource)).toEqual(childResource.id);
    });

    it('should insert the record: it is created when submitted', async () => {
      const draft = await createRecord(childForm, { name: 'inserted' });
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      await Record.collection.updateOne(
        { _id: draft._id },
        { $set: { createdAt, modifiedAt: createdAt } }
      );

      await submit({ child: draft.id });

      const record = await Record.findById(draft._id);
      expect(record.createdAt.getTime()).toBeGreaterThan(createdAt.getTime());
      expect(record.modifiedAt.getTime()).toBeGreaterThan(createdAt.getTime());
    });

    it('should keep the versions the draft holds', async () => {
      const version = await Version.create({
        data: { name: 'before' },
        createdBy: context.user._id,
      });
      const draft = await createRecord(childForm, { name: 'versions' });
      await Record.updateOne({ _id: draft._id }, { versions: [version._id] });

      await submit({ child: draft.id });

      const record = await Record.findById(draft._id);
      expect(record.versions.map(String)).toEqual([version.id]);
      expect(await Version.exists({ _id: version._id })).toBeTruthy();
    });

    it('should submit the drafts whatever their depth', async () => {
      const grandchild = await createRecord(grandchildForm, { name: 'deep' });
      const child = await createRecord(childForm, {
        name: 'middle',
        grandchildren: [grandchild.id],
      });

      await submit({ children: [child.id] });

      const records = await Record.find({
        _id: { $in: [child._id, grandchild._id] },
      });
      expect(records.map((x) => x.draft)).toEqual([false, false]);
      expect(getNextId).toHaveBeenCalledWith(String(grandchildForm.resource));
      // References are left untouched, as the ids are
      const submittedChild = records.find((x) => x._id.equals(child._id));
      expect(submittedChild.data.grandchildren).toEqual([grandchild.id]);
    });

    it('should submit the drafts of a submitted record', async () => {
      const grandchild = await createRecord(grandchildForm, { name: 'left' });
      const child = await createRecord(
        childForm,
        { name: 'submitted', grandchildren: [grandchild.id] },
        { draft: false }
      );

      await submit({ children: [child.id] });

      // Only drafts are searched for drafts
      expect((await Record.findById(grandchild._id)).draft).toBe(true);
    });

    it('should submit the deepest drafts first', async () => {
      const grandchild = await createRecord(grandchildForm, { name: 'deep' });
      const child = await createRecord(childForm, {
        name: 'order',
        grandchildren: [grandchild.id],
      });

      const drafts = await getNestedDrafts(
        { child: child.id },
        parentForm.fields,
        context
      );

      expect(drafts.map((x) => x.draft.id)).toEqual([grandchild.id, child.id]);
    });

    it('should handle drafts referencing each other', async () => {
      const child = await createRecord(childForm, { name: 'loop' });
      const grandchild = await createRecord(grandchildForm, {
        name: 'loop',
        parents: [child.id],
      });
      await Record.updateOne(
        { _id: child._id },
        { 'data.grandchildren': [grandchild.id] }
      );

      await submit({ child: child.id, children: [child.id] });

      const records = await Record.find({
        _id: { $in: [child._id, grandchild._id] },
      });
      expect(records.map((x) => x.draft)).toEqual([false, false]);
      expect(getNextId).toHaveBeenCalledTimes(2);
    });

    it('should clear the draft flag of the files, whatever the depth', async () => {
      const file = { name: 'a.pdf', content: 'form/a', draft: true };
      const grandchild = await createRecord(grandchildForm, { files: [file] });
      const child = await createRecord(childForm, {
        name: 'files',
        files: [file, { name: 'b.pdf', content: { itemId: 'item' } }],
        grandchildren: [grandchild.id],
      });

      await submit({ child: child.id });

      expect((await Record.findById(child._id)).data.files).toEqual([
        { name: 'a.pdf', content: 'form/a' },
        { name: 'b.pdf', content: { itemId: 'item' } },
      ]);
      expect((await Record.findById(grandchild._id)).data.files).toEqual([
        { name: 'a.pdf', content: 'form/a' },
      ]);
    });
  });

  describe('Records left untouched', () => {
    it('should not submit the draft of another user', async () => {
      const draft = await createRecord(
        childForm,
        { name: 'other user' },
        { user: new Types.ObjectId() }
      );

      await submit({ child: draft.id });

      expect((await Record.findById(draft._id)).draft).toBe(true);
      expect(getNextId).not.toHaveBeenCalled();
    });

    it('should not submit an archived draft', async () => {
      const draft = await createRecord(childForm, { name: 'archived' });
      await Record.updateOne({ _id: draft._id }, { archived: true });

      await submit({ child: draft.id });

      expect((await Record.findById(draft._id)).draft).toBe(true);
    });

    it('should leave the submitted records as they are', async () => {
      const record = await createRecord(
        childForm,
        { name: 'already submitted' },
        { draft: false }
      );

      await submit({ child: record.id });

      const untouched = await Record.findById(record._id);
      expect(untouched.incrementalId).toEqual(record.incrementalId);
      expect(untouched.createdAt).toEqual(record.createdAt);
      expect(getNextId).not.toHaveBeenCalled();
    });

    it('should only read the resource and resources questions', async () => {
      const draft = await createRecord(childForm, { name: 'not referenced' });

      await submit({ name: draft.id, unknown: draft.id });

      expect((await Record.findById(draft._id)).draft).toBe(true);
    });

    it('should ignore the values which are not record ids', async () => {
      const drafts = await getNestedDrafts(
        { child: 'not-an-id', children: [null, 12, 'temporary'] },
        parentForm.fields,
        context
      );
      expect(drafts).toEqual([]);
    });

    it('should not look for drafts when the user is not logged', async () => {
      const draft = await createRecord(childForm, { name: 'public' });
      context = { ...context, user: null } as unknown as Context;

      await submit({ child: draft.id });

      expect((await Record.findById(draft._id)).draft).toBe(true);
    });

    it('should not submit a draft twice', async () => {
      const draft = await createRecord(childForm, { name: 'twice' });
      const drafts = await getNestedDrafts(
        { child: draft.id },
        parentForm.fields,
        context
      );

      await Promise.all([
        submitNestedDrafts(drafts),
        submitNestedDrafts(drafts),
      ]);

      expect(await Record.countDocuments({ _id: draft._id })).toEqual(1);
      expect((await Record.findById(draft._id)).draft).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should not use an incremental id for a draft deleted in the meantime', async () => {
      const draft = await createRecord(childForm, { name: 'deleted' });
      const drafts = await getNestedDrafts(
        { child: draft.id },
        parentForm.fields,
        context
      );
      await Record.deleteOne({ _id: draft._id });

      await submitNestedDrafts(drafts);

      expect(await Record.exists({ _id: draft._id })).toBeNull();
      expect(getNextId).not.toHaveBeenCalled();
    });
  });

  describe('Drafts which cannot be submitted', () => {
    it('should throw if the user cannot add records to the form of a draft', async () => {
      const grandchild = await createRecord(grandchildForm, { name: 'deep' });
      const child = await createRecord(childForm, {
        name: 'forbidden',
        grandchildren: [grandchild.id],
      });
      (extendAbilityForRecords as jest.Mock).mockImplementation(
        async (user, form) => ({
          can: () => !grandchildForm._id.equals(form._id),
        })
      );

      const result = getNestedDrafts(
        { child: child.id },
        parentForm.fields,
        context
      );

      await expect(result).rejects.toThrow(GraphQLError);
      await expect(result).rejects.toThrow(
        'common.errors.permissionNotGranted'
      );
      // Nothing is submitted
      expect(await Record.countDocuments({ draft: true })).toBeGreaterThan(1);
      expect((await Record.findById(child._id)).draft).toBe(true);
    });

    it('should throw if a draft breaks a blocking uniqueness rule', async () => {
      await createRecord(childForm, { name: 'duplicate' }, { draft: false });
      const draft = await createRecord(childForm, { name: 'duplicate' });

      const result = getNestedDrafts(
        { child: draft.id },
        parentForm.fields,
        context
      );

      await expect(result).rejects.toThrow(UniquenessError);
      expect((await Record.findById(draft._id)).draft).toBe(true);
    });

    it('should give the draft back if the record cannot be saved', async () => {
      const failing = await createRecord(childForm, { name: 'failing' });
      const next = await createRecord(childForm, { name: 'next' });
      const drafts = await getNestedDrafts(
        { children: [failing.id, next.id] },
        parentForm.fields,
        context
      );
      jest
        .spyOn(Record.prototype, 'save')
        .mockRejectedValueOnce(new Error('Database error'));

      // The parent record is saved already: the request does not fail
      await submitNestedDrafts(drafts);

      const records = await Record.find({
        _id: { $in: [failing._id, next._id] },
      }).sort({ 'data.name': 1 });
      expect(records.map((x) => x.draft)).toEqual([true, false]);
      expect(records[0].incrementalId).toBeUndefined();
      expect(records[0].data).toEqual({ name: 'failing' });
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
