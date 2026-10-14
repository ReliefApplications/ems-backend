import { Form, Record, Resource } from '@models';
import { getNextId } from '@utils/form';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

/** In-memory store standing in for Redis */
const store = new Map<string, string>();

// Replace ioredis with a minimal in-memory implementation of the commands used
jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string | number, mode?: string) => {
      if (mode === 'NX' && store.has(key)) {
        return null;
      }
      store.set(key, String(value));
      return 'OK';
    },
    exists: async (key: string) => (store.has(key) ? 1 : 0),
    incr: async (key: string) => {
      const value = Number(store.get(key) ?? 0) + 1;
      store.set(key, String(value));
      return value;
    },
  }))
);

describe('getNextId', () => {
  let databaseHelpers: DatabaseHelpers;
  const year = String(new Date().getFullYear());

  /**
   * Creates a resource with its core form.
   *
   * @returns Created resource.
   */
  const createResource = async () => {
    const resource = await Resource.create({ name: 'Patient', fields: [] });
    await Form.create({
      name: 'Patient',
      core: true,
      resource: resource._id,
      status: 'active',
    });
    return resource;
  };

  /**
   * Creates a submitted record of a resource.
   *
   * @param resource Resource of the record.
   * @param fields Extra fields of the record.
   * @returns Created record.
   */
  const createRecord = (resource: any, fields: { [key: string]: any } = {}) =>
    Record.create({
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: {},
      ...fields,
    });

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  afterEach(async () => {
    store.clear();
    await Record.deleteMany({});
    await Form.deleteMany({});
    await Resource.deleteMany({});
  });

  it('starts from the first letter of the form name for a new structure', async () => {
    const resource = await createResource();

    expect(await getNextId(String(resource._id))).toBe(`${year}-P00000001`);
    expect(await getNextId(String(resource._id))).toBe(`${year}-P00000002`);
  });

  it('continues from the highest id, not from the most recently created record', async () => {
    const resource = await createResource();
    // A draft created first, then published after a newer record: it has the
    // oldest _id but the highest incremental id
    await createRecord(resource, { incrementalId: `${year}-P00000334` });
    await createRecord(resource, { incrementalId: `${year}-P00000333` });

    expect(await getNextId(String(resource._id))).toBe(`${year}-P00000335`);
  });

  it('ignores drafts and ids of previous years', async () => {
    const resource = await createResource();
    await createRecord(resource, { incrementalId: `${year}-P00000002` });
    await createRecord(resource, { incrementalId: `2020-P00000900` });
    await createRecord(resource, { draft: true });

    expect(await getNextId(String(resource._id))).toBe(`${year}-P00000003`);
  });

  it('keeps the letter of the existing ids over the form name', async () => {
    const resource = await createResource();
    await createRecord(resource, { incrementalId: `2020-X00000010` });

    expect(await getNextId(String(resource._id))).toBe(`${year}-X00000001`);
  });

  it('never returns the same id to concurrent calls', async () => {
    const resource = await createResource();
    await createRecord(resource, { incrementalId: `${year}-P00000005` });

    const ids = await Promise.all(
      Array.from({ length: 20 }, () => getNextId(String(resource._id)))
    );

    expect(new Set(ids).size).toBe(20);
    expect(ids.sort()[0]).toBe(`${year}-P00000006`);
  });

  it('numbers submitted records that have no incremental id', async () => {
    const resource = await createResource();
    const legacy = await createRecord(resource, {
      createdAt: new Date('2020-01-01'),
    });
    await createRecord(resource, { incrementalId: `${year}-P00000001` });

    expect(await getNextId(String(resource._id))).toBe(`${year}-P00000003`);
    const updated = await Record.findById(legacy._id);
    expect(updated.incrementalId).toBe(`${year}-P00000002`);
  });

  it('fails when no form is found for the structure', async () => {
    const resource = await Resource.create({ name: 'Orphan', fields: [] });

    await expect(getNextId(String(resource._id))).rejects.toThrow();
  });
});
