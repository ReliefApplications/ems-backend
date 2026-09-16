import { Version } from '@models';
import { copyRecordVersions } from '@utils/form/copyRecordVersions';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

describe('copyRecordVersions', () => {
  let databaseHelpers: DatabaseHelpers;
  const author = new Types.ObjectId();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  /**
   * Create a record like object, with the given versions.
   *
   * @param versions ids of the record's versions
   * @returns a minimal record, enough for copyRecordVersions
   */
  const record = (versions: any[]) =>
    ({
      data: { description: 'current' },
      createdAt: new Date('2026-01-01'),
      modifiedAt: new Date('2026-03-01'),
      versions,
    } as any);

  /**
   * Create version documents in database.
   *
   * @param descriptions description stored in each version, in order
   * @returns the created versions
   */
  const createVersions = async (descriptions: string[]) =>
    Promise.all(
      descriptions.map((description, index) =>
        Version.create({
          data: { description },
          createdAt: new Date(`2026-02-0${index + 1}`),
          createdBy: author,
        })
      )
    );

  it('should duplicate the versions instead of reusing them', async () => {
    const versions = await createVersions(['v1', 'v2']);
    const ids = await copyRecordVersions(record(versions.map((x) => x._id)));

    expect(ids).toHaveLength(2);
    ids.forEach((id) => {
      expect(versions.some((version) => version._id.equals(id))).toBe(false);
    });
    // Source versions are left untouched
    expect(await Version.countDocuments()).toEqual(4);
  });

  it('should keep data, creation date and author of each version, in order', async () => {
    const versions = await createVersions(['v1', 'v2', 'v3']);
    const ids = await copyRecordVersions(record(versions.map((x) => x._id)));
    const copies = await Promise.all(ids.map((id) => Version.findById(id)));

    expect(copies.map((x) => x.data.description)).toEqual(['v1', 'v2', 'v3']);
    copies.forEach((copy, index) => {
      expect(copy.createdAt).toEqual(versions[index].createdAt);
      expect(author.equals(copy.createdBy)).toBe(true);
    });
  });

  it('should skip versions that cannot be found', async () => {
    const versions = await createVersions(['v1']);
    const ids = await copyRecordVersions(
      record([versions[0]._id, new Types.ObjectId()])
    );

    expect(ids).toHaveLength(1);
  });

  it('should return an empty list when the record has no version', async () => {
    expect(await copyRecordVersions(record([]))).toEqual([]);
    expect(await copyRecordVersions({ data: {} } as any)).toEqual([]);
  });

  it('should append the current data of the record when asked to', async () => {
    const versions = await createVersions(['v1', 'v2']);
    const source = record(versions.map((x) => x._id));
    const createdBy = new Types.ObjectId();
    const ids = await copyRecordVersions(source, {
      appendCurrentData: true,
      createdBy,
    });
    const copies = await Promise.all(ids.map((id) => Version.findById(id)));

    expect(copies.map((x) => x.data.description)).toEqual([
      'v1',
      'v2',
      'current',
    ]);
    const appended = copies[2];
    expect(appended.createdAt).toEqual(source.modifiedAt);
    expect(createdBy.equals(appended.createdBy)).toBe(true);
  });

  it('should append the current data of a record without any version', async () => {
    const ids = await copyRecordVersions(record([]), {
      appendCurrentData: true,
    });
    const copies = await Promise.all(ids.map((id) => Version.findById(id)));

    expect(copies.map((x) => x.data.description)).toEqual(['current']);
  });

  it('should fall back on the creation date of a record never modified', async () => {
    const source = record([]);
    source.modifiedAt = undefined;
    const ids = await copyRecordVersions(source, { appendCurrentData: true });
    const version = await Version.findById(ids[0]);

    expect(version.createdAt).toEqual(source.createdAt);
  });
});
