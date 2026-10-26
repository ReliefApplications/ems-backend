import {
  Form,
  Record,
  Resource,
  Version,
  getRecordModel,
  getVersionModel,
} from '@models';
import {
  deleteRecordById,
  deleteRecords,
  findRecordById,
  findRecordsAcrossStorages,
  findRecordsByIds,
  getRecordModelForForm,
  getRecordModelForResource,
  getStorageStatus,
  isStub,
  moveStorage,
  reconcileStorage,
  refreshStorageRegistry,
  revertStorage,
  saveRecord,
  updateRecordById,
  updateRecords,
} from '@utils/storage';
import mongoose, { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

/** Name of the storage database used by the tests */
const STORAGE = 'test_records_storage';

describe('Record storage', () => {
  let databaseHelpers: DatabaseHelpers;
  let shared: Resource;
  let sharedForm: Form;
  let secret: Resource;
  let secretForm: Form;
  let counter = 0;

  /**
   * Creates a resource and its core form.
   *
   * @param storage Name of the storage database, if any
   * @returns The resource and its form
   */
  const createResource = async (storage?: string) => {
    const resource = await Resource.create({
      name: `Resource-${new Types.ObjectId()}`,
      fields: [{ name: 'title' }],
    });
    const form = await Form.create({
      name: 'Form',
      graphQLTypeName: `Form${new Types.ObjectId()}`,
      resource: resource._id,
      core: true,
      fields: [{ name: 'title' }],
      ...(storage && { storage }),
    });
    return { resource, form };
  };

  /**
   * Creates a record in the storage of a resource.
   *
   * @param resource Resource of the record
   * @param form Form of the record
   * @param title Value of the title field
   * @param extra Extra fields of the record
   * @returns The saved record
   */
  const createRecord = async (
    resource: Resource,
    form: Form,
    title: string,
    extra: any = {}
  ) => {
    const model = await getRecordModelForResource(resource);
    return saveRecord(
      new model({
        incrementalId: `2026-A${String(++counter).padStart(8, '0')}`,
        form: form._id,
        _form: { _id: form._id, name: form.name },
        resource: resource._id,
        data: { title },
        createdBy: { user: new Types.ObjectId() },
        ...extra,
      })
    );
  };

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    ({ resource: shared, form: sharedForm } = await createResource());
    ({ resource: secret, form: secretForm } = await createResource(STORAGE));
    await refreshStorageRegistry();
  });

  afterAll(async () => {
    await mongoose.connection.useDb(STORAGE).dropDatabase();
    await databaseHelpers.disconnect();
  });

  afterEach(async () => {
    await Record.deleteMany({});
    await getRecordModel(STORAGE).deleteMany({});
    await Version.deleteMany({});
    await getVersionModel(STORAGE).deleteMany({});
  });

  describe('models', () => {
    it('gives the main models without storage', () => {
      expect(getRecordModel()).toBe(Record);
      expect(getVersionModel()).toBe(Version);
    });

    it('compiles the models of a storage database on its connection', () => {
      const model = getRecordModel(STORAGE);
      expect(model.modelName).toBe('Record');
      expect(model.db.name).toBe(STORAGE);
      expect(model.db).not.toBe(mongoose.connection);
      expect(model.collection.name).toBe('records');
      expect(getRecordModel(STORAGE)).toBe(model);
      expect(getVersionModel(STORAGE).db.name).toBe(STORAGE);
      expect(getVersionModel(STORAGE).collection.name).toBe('versions');
    });

    it('rejects invalid names and the main database', () => {
      expect(() => getRecordModel('not valid')).toThrow();
      expect(() => getRecordModel(mongoose.connection.name)).toThrow(
        /main database/
      );
    });

    it('resolves the model of a resource and of a form', async () => {
      expect(await getRecordModelForResource(shared)).toBe(Record);
      expect(await getRecordModelForResource(String(secret._id))).toBe(
        getRecordModel(STORAGE)
      );
      expect(await getRecordModelForForm(secretForm)).toBe(
        getRecordModel(STORAGE)
      );
      expect(await getRecordModelForForm({ resource: null })).toBe(Record);
      expect(await getRecordModelForResource(secretForm._id)).toBe(
        getRecordModel(STORAGE)
      );
    });

    it('applies the setting of the core form to every form of the resource', async () => {
      // The GraphQL entities of non-core forms are identified by the form id
      const template = await Form.create({
        name: 'Template',
        graphQLTypeName: `Template${new Types.ObjectId()}`,
        resource: secret._id,
        core: false,
        fields: [{ name: 'title' }],
      });
      await refreshStorageRegistry();
      expect(await getRecordModelForResource(template._id)).toBe(
        getRecordModel(STORAGE)
      );
      expect(await getRecordModelForForm(template)).toBe(
        getRecordModel(STORAGE)
      );
      expect(await getRecordModelForResource(sharedForm._id)).toBe(Record);
      await Form.deleteOne({ _id: template._id });
    });

    it('stores the records of a standalone form with a storage', async () => {
      const standalone = await Form.create({
        name: 'Standalone',
        graphQLTypeName: `Standalone${new Types.ObjectId()}`,
        core: true,
        fields: [{ name: 'title' }],
        storage: STORAGE,
      });
      await refreshStorageRegistry();
      expect(await getRecordModelForForm(standalone)).toBe(
        getRecordModel(STORAGE)
      );
      expect(await getRecordModelForResource(standalone._id)).toBe(
        getRecordModel(STORAGE)
      );
      await Form.deleteOne({ _id: standalone._id });
      await refreshStorageRegistry();
    });

    it('keeps the record abilities on the stored documents', async () => {
      const record = await createRecord(secret, secretForm, 'A');
      // Same model name, so the CASL subject type is unchanged
      expect((record.constructor as any).modelName).toBe('Record');
    });
  });

  describe('writes', () => {
    it('stores a record in the storage database, with a stub in the main one', async () => {
      const record = await createRecord(secret, secretForm, 'A');
      expect(record.storage).toBe(STORAGE);
      const stored = await getRecordModel(STORAGE).findById(record._id);
      expect(stored.data).toEqual({ title: 'A' });
      const stub: any = await Record.findById(record._id).lean();
      expect(isStub(stub)).toBe(true);
      expect(stub.storage).toBe(STORAGE);
      expect(stub.data).toBeUndefined();
      expect(stub._form).toBeUndefined();
      expect(stub.incrementalId).toBe(record.incrementalId);
      expect(String(stub.resource)).toBe(String(secret._id));
    });

    it('keeps the records of the main database as they are', async () => {
      const record = await createRecord(shared, sharedForm, 'A');
      expect(record.storage).toBeUndefined();
      const stored: any = await Record.findById(record._id).lean();
      expect(stored.data).toEqual({ title: 'A' });
      expect(stored.storage).toBeUndefined();
    });

    it('updates a record in its database and refreshes its stub', async () => {
      const record = await createRecord(secret, secretForm, 'A');
      const updated = await updateRecordById(record, { archived: true });
      expect(updated.archived).toBe(true);
      expect(
        (await getRecordModel(STORAGE).findById(record._id)).archived
      ).toBe(true);
      expect((await Record.findById(record._id)).archived).toBe(true);
    });

    it('updates records of several databases', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      const b = await createRecord(shared, sharedForm, 'B');
      const modified = await updateRecords([a, b], {
        $set: { archived: true },
      });
      expect(modified).toBe(2);
      expect((await Record.findById(a._id)).archived).toBe(true);
      expect((await Record.findById(b._id)).archived).toBe(true);
      expect((await getRecordModel(STORAGE).findById(a._id)).archived).toBe(
        true
      );
    });

    it('deletes a record, its stub and its versions', async () => {
      const version = await getVersionModel(STORAGE).create({
        data: { title: 'old' },
      });
      const record = await createRecord(secret, secretForm, 'A', {
        versions: [version._id],
      });
      await deleteRecordById(record);
      expect(await getRecordModel(STORAGE).findById(record._id)).toBeNull();
      expect(await Record.findById(record._id)).toBeNull();
      expect(await getVersionModel(STORAGE).findById(version._id)).toBeNull();
    });

    it('deletes records of several databases', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      const b = await createRecord(shared, sharedForm, 'B');
      expect(await deleteRecords([a, b])).toBe(2);
      expect(await Record.countDocuments({})).toBe(0);
      expect(await getRecordModel(STORAGE).countDocuments({})).toBe(0);
    });
  });

  describe('reads', () => {
    it('finds a record by id wherever it is stored', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      const b = await createRecord(shared, sharedForm, 'B');
      const foundA = await findRecordById(a._id);
      expect(foundA.data).toEqual({ title: 'A' });
      expect(foundA.storage).toBe(STORAGE);
      expect((await findRecordById(String(b._id))).data).toEqual({
        title: 'B',
      });
      expect(await findRecordById(new Types.ObjectId())).toBeNull();
      expect(await findRecordById('not an id')).toBeNull();
    });

    it('applies the filter on the data of a stored record', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      expect(await findRecordById(a._id, { 'data.title': 'A' })).not.toBeNull();
      expect(await findRecordById(a._id, { 'data.title': 'B' })).toBeNull();
      expect(await findRecordById(a._id, { archived: true })).toBeNull();
    });

    it('finds a stored record whose stub is missing', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      await Record.collection.deleteOne({ _id: a._id });
      expect((await findRecordById(a._id)).data).toEqual({ title: 'A' });
    });

    it('populates references from the main database, and versions from the storage', async () => {
      const version = await getVersionModel(STORAGE).create({
        data: { title: 'old' },
      });
      const a = await createRecord(secret, secretForm, 'A', {
        versions: [version._id],
      });
      const found = await findRecordById(
        a._id,
        {},
        {
          populate: [
            { path: 'form', model: 'Form' },
            'resource',
            { path: 'versions' },
          ],
          select: 'form resource versions data',
        }
      );
      expect((found.form as Form).name).toBe('Form');
      expect((found.resource as Resource).name).toBe(secret.name);
      expect(found.versions[0].data).toEqual({ title: 'old' });
      expect(found.incrementalId).toBeUndefined();
    });

    it('finds records by ids across databases', async () => {
      const a = await createRecord(secret, secretForm, 'A');
      const b = await createRecord(shared, sharedForm, 'B');
      const found = await findRecordsByIds([
        a._id,
        b._id,
        new Types.ObjectId(),
      ]);
      expect(found.map((x) => x.data.title).sort()).toEqual(['A', 'B']);
      const filtered = await findRecordsByIds([a._id, b._id], {
        'data.title': 'A',
      });
      expect(filtered.map((x) => x.data.title)).toEqual(['A']);
    });

    it('finds records across databases, without the stubs', async () => {
      await createRecord(secret, secretForm, 'A');
      await createRecord(shared, sharedForm, 'B');
      const all = await findRecordsAcrossStorages({ archived: { $ne: true } });
      expect(all.map((x) => x.data.title).sort()).toEqual(['A', 'B']);
      const onlySecret = await findRecordsAcrossStorages({
        resource: secret._id,
      });
      expect(onlySecret.map((x) => x.data.title)).toEqual(['A']);
    });
  });

  describe('cascading deletions', () => {
    it('deletes the stored records and stubs with their resource', async () => {
      const { resource, form } = await createResource(STORAGE);
      await refreshStorageRegistry();
      const record = await createRecord(resource, form, 'A');
      await Resource.deleteOne({ _id: resource._id });
      expect(await getRecordModel(STORAGE).findById(record._id)).toBeNull();
      expect(await Record.findById(record._id)).toBeNull();
      expect(await Form.findById(form._id)).toBeNull();
      await refreshStorageRegistry();
    });

    it('deletes the stored records and stubs with their form', async () => {
      const record = await createRecord(secret, secretForm, 'A');
      const other = await createRecord(shared, sharedForm, 'B');
      await Form.deleteOne({ _id: secretForm._id });
      expect(await getRecordModel(STORAGE).findById(record._id)).toBeNull();
      expect(await Record.findById(record._id)).toBeNull();
      expect(await Record.findById(other._id)).not.toBeNull();
      secretForm = await Form.create({
        name: 'Form',
        graphQLTypeName: `Form${new Types.ObjectId()}`,
        resource: secret._id,
        core: true,
        fields: [{ name: 'title' }],
        storage: STORAGE,
      });
      await refreshStorageRegistry();
    });
  });

  describe('migration', () => {
    it('moves a resource to its storage database, keeps it consistent, and reverts it', async () => {
      const { resource, form } = await createResource();
      const version = await Version.create({ data: { title: 'old' } });
      const a = await createRecord(resource, form, 'A', {
        versions: [version._id],
      });
      const b = await createRecord(resource, form, 'B');
      const other = await createRecord(shared, sharedForm, 'C');

      // Not configured yet
      await expect(moveStorage(resource._id)).rejects.toThrow(/no storage/);
      // The administrator sets the storage on the form, directly in the database
      await Form.updateOne({ _id: form._id }, { storage: STORAGE });

      // Move, from the id of the resource or of its form
      const report = await moveStorage(form._id, { batchSize: 1 });
      expect(report.moved).toBe(2);
      const stored = getRecordModel(STORAGE);
      const movedA: any = await stored.findById(a._id).lean();
      expect(movedA.data).toEqual({ title: 'A' });
      expect(movedA.storage).toBe(STORAGE);
      expect(String(movedA.versions[0])).toBe(String(version._id));
      expect(
        await getVersionModel(STORAGE).findById(version._id)
      ).not.toBeNull();
      expect(await Version.findById(version._id)).toBeNull();
      const stubA: any = await Record.findById(a._id).lean();
      expect(isStub(stubA)).toBe(true);
      expect(stubA.incrementalId).toBe(a.incrementalId);
      expect(await Record.countDocuments({ resource: resource._id })).toBe(2);
      // Untouched records
      expect((await Record.findById(other._id)).data).toEqual({ title: 'C' });
      // The registry knows the new storage
      expect(await getRecordModelForResource(resource._id)).toBe(stored);
      expect(await moveStorage(resource._id)).toEqual({
        moved: 0,
        synced: 2,
        orphans: 0,
      });

      // Reconcile: a record created in full in the main database, a stub
      // without record, and a stub out of sync
      await Record.create({
        incrementalId: '2026-A99999999',
        form: form._id,
        _form: { _id: form._id, name: form.name },
        resource: resource._id,
        data: { title: 'D' },
      });
      const orphan = new Types.ObjectId();
      await Record.collection.insertOne({
        _id: orphan,
        resource: resource._id,
        form: form._id,
        storage: STORAGE,
      });
      await stored.updateOne({ _id: b._id }, { archived: true });
      const fixed = await reconcileStorage(resource._id);
      expect(fixed).toEqual({ moved: 1, synced: 3, orphans: 1 });
      expect(await stored.countDocuments({ resource: resource._id })).toBe(3);
      expect(await Record.findById(orphan)).toBeNull();
      expect((await Record.findById(b._id)).archived).toBe(true);
      expect(
        await Record.countDocuments({
          resource: resource._id,
          storage: { $exists: false },
        })
      ).toBe(0);

      const status = await getStorageStatus();
      expect(status).toContainEqual({
        id: String(resource._id),
        name: resource.name,
        storage: STORAGE,
        records: 3,
        stubs: 3,
        strays: 0,
      });

      // Revert
      expect(await revertStorage(resource._id)).toBe(3);
      expect((await Form.findById(form._id)).storage).toBeUndefined();
      const backA: any = await Record.findById(a._id).lean();
      expect(backA.data).toEqual({ title: 'A' });
      expect(backA.storage).toBeUndefined();
      expect(await Version.findById(version._id)).not.toBeNull();
      expect(await Record.countDocuments({ resource: resource._id })).toBe(3);
      expect(await getRecordModelForResource(resource._id)).toBe(Record);
      // The other resource of the same storage database is untouched
      expect(await getRecordModelForResource(secret._id)).toBe(stored);
    });

    it('refuses unknown structures and structures without storage', async () => {
      await expect(moveStorage(new Types.ObjectId())).rejects.toThrow(
        /No resource or form/
      );
      await expect(revertStorage(shared._id)).rejects.toThrow(/no storage/);
    });
  });
});
