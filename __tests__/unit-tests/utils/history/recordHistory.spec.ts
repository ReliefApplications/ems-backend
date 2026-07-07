import { RecordHistory } from '@utils/history';
import { Record, Version } from '@models';

jest.mock('@models');

describe('RecordHistory Class Unit Tests', () => {
  let record: any;
  let options: any;

  beforeEach(() => {
    jest.clearAllMocks();

    record = {
      createdAt: new Date('2026-07-01T12:00:00Z'),
      modifiedAt: new Date('2026-07-04T12:00:00Z'),
      _createdBy: { user: { name: 'Creator User' } },
      versions: ['versionId1', 'versionId2', 'versionId3'],
      resource: {
        fields: [
          { name: 'name', title: 'Name Field' },
          { name: 'age', title: 'Age Field' },
        ],
      },
      form: {
        structure: JSON.stringify({
          pages: [
            {
              elements: [
                { type: 'text', name: 'name', title: 'Name Field' },
                { type: 'text', name: 'age', title: 'Age Field' },
              ],
            },
          ],
        }),
      },
      data: { name: 'Alice', age: 30 },
      accessibleFieldsBy: jest.fn().mockReturnValue(['data']),
      model: jest.fn().mockReturnValue(Version),
    };

    options = {
      translate: jest.fn().mockImplementation((key) => key),
      ability: {} as any,
      context: {
        locale: 'en',
      },
    };
  });

  it('should instantiate and extract fields correctly', () => {
    const recordHistory = new RecordHistory(record, options);
    expect(recordHistory.fields).toBeDefined();
    expect(recordHistory.fields.length).toBe(2);
  });

  it('should process history without pagination correctly', async () => {
    const versionsList = [
      {
        _id: 'versionId1',
        createdAt: new Date('2026-07-02T12:00:00Z'),
        data: { name: 'Bob', age: 25 },
        toObject: jest.fn().mockReturnValue({ _id: 'versionId1', createdAt: new Date('2026-07-02T12:00:00Z'), data: { name: 'Bob', age: 25 } }),
      },
      {
        _id: 'versionId2',
        createdAt: new Date('2026-07-03T12:00:00Z'),
        data: { name: 'Bob', age: 28 },
        toObject: jest.fn().mockReturnValue({ _id: 'versionId2', createdAt: new Date('2026-07-03T12:00:00Z'), data: { name: 'Bob', age: 28 } }),
      },
      {
        _id: 'versionId3',
        createdAt: new Date('2026-07-04T12:00:00Z'),
        data: { name: 'Alice', age: 28 },
        toObject: jest.fn().mockReturnValue({ _id: 'versionId3', createdAt: new Date('2026-07-04T12:00:00Z'), data: { name: 'Alice', age: 28 } }),
      },
    ];

    (Version.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(versionsList),
    });

    const recordHistory = new RecordHistory(record, options);
    const history = await recordHistory.getHistory();

    expect(history.length).toBe(4); // initial + v1 + v2 + current
    expect(history[0].changes.length).toBe(1); // current vs v3: age changed from 28 to 30
    expect(history[0].changes[0].old).toBe(28);
    expect(history[0].changes[0].new).toBe(30);
  });

  it('should process history with skip=0, limit=2 correctly', async () => {
    const versionsList = [
      {
        _id: 'versionId2',
        createdAt: new Date('2026-07-03T12:00:00Z'),
        data: { name: 'Bob', age: 28 },
        toObject: jest.fn().mockReturnValue({ _id: 'versionId2', createdAt: new Date('2026-07-03T12:00:00Z'), data: { name: 'Bob', age: 28 } }),
      },
      {
        _id: 'versionId3',
        createdAt: new Date('2026-07-04T12:00:00Z'),
        data: { name: 'Alice', age: 28 },
        toObject: jest.fn().mockReturnValue({ _id: 'versionId3', createdAt: new Date('2026-07-04T12:00:00Z'), data: { name: 'Alice', age: 28 } }),
      },
    ];

    (Version.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(versionsList),
    });

    const recordHistory = new RecordHistory(record, options);
    // skip 0, limit 2: entries index 0 and 1 (current vs v3, v3 vs v2)
    // Needs versions: N-1 = 2 (v3), N-2 = 1 (v2), N-3 = 0 (v1) for boundary.
    // Clamped slice: versions index 1 and 2 (v2 and v3) since skip=0, endEntry=1.
    const history = await recordHistory.getHistory({ skip: 0, limit: 2 });

    expect(Version.find).toHaveBeenCalledWith({
      _id: { $in: ['versionId2', 'versionId3'] },
    });
    expect(history.length).toBe(2);
    expect(history[0].changes[0].field).toBe('age'); // age modified from 28 to 30
    expect(history[1].changes[0].field).toBe('name'); // name modified from Bob to Alice
  });

  it('should return an empty array when the requested page is past the end of history', async () => {
    const recordHistory = new RecordHistory(record, options);
    // record has 3 versions -> 4 total entries (reversed indices 0..3), so a
    // page starting at index 4 has nothing to return.
    const history = await recordHistory.getHistory({ skip: 4, limit: 2 });

    expect(Version.find).not.toHaveBeenCalled();
    expect(history).toEqual([]);
  });

  it('should apply pagination to a record with no prior versions', async () => {
    const noVersionsRecord = { ...record, versions: [] };
    const recordHistory = new RecordHistory(noVersionsRecord, options);

    const firstPage = await recordHistory.getHistory({ skip: 0, limit: 1 });
    expect(Version.find).not.toHaveBeenCalled();
    expect(firstPage.length).toBe(1);

    const secondPage = await recordHistory.getHistory({ skip: 1, limit: 1 });
    expect(secondPage).toEqual([]);
  });

  it('should leave a boolean value unchanged when no label is configured', async () => {
    const booleanRecord = {
      ...record,
      versions: [],
      resource: {
        fields: [{ name: 'active', title: 'Active Field', type: 'boolean' }],
      },
      data: { active: true },
    };
    const recordHistory = new RecordHistory(booleanRecord, options);

    const history = await recordHistory.getHistory();

    expect(history.length).toBe(1);
    expect(history[0].changes[0].field).toBe('active');
    expect(history[0].changes[0].new).toBe(true);
  });
});
