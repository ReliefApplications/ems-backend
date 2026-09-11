import { Record } from '@models';
import { validateCustomIds } from '@utils/files/validateCustomIds';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

let databaseHelpers: DatabaseHelpers;

describe('validateCustomIds', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('returns no error and no ids for an empty column', async () => {
    const result = await validateCustomIds([]);
    expect(result).toEqual({ error: null, ids: [] });
  });

  it('accepts valid hex ids regardless of cell representation', async () => {
    const id1 = new Types.ObjectId().toString();
    const id2 = new Types.ObjectId().toString().toUpperCase();
    const id3 = new Types.ObjectId().toString();
    const id4 = new Types.ObjectId().toString();
    const result = await validateCustomIds([
      { rowNumber: 2, rawValue: id1 },
      { rowNumber: 3, rawValue: { text: id2 } },
      { rowNumber: 4, rawValue: { result: id3 } },
      { rowNumber: 5, rawValue: { richText: [{ text: id4.slice(0, 12) }, { text: id4.slice(12) }] } },
    ]);
    expect(result).toEqual({ error: null, ids: [id1, id2, id3, id4] });
  });

  it('rejects a value that is not 24 hex characters', async () => {
    const result = await validateCustomIds([
      { rowNumber: 2, rawValue: 'not-an-id' },
    ]);
    expect(result).toEqual({
      error: { key: 'invalidCustomId', params: { row: 2, value: 'not-an-id' } },
      ids: [],
    });
  });

  it('rejects an empty cell as invalid format', async () => {
    const result = await validateCustomIds([{ rowNumber: 2, rawValue: '  ' }]);
    expect(result).toEqual({
      error: { key: 'invalidCustomId', params: { row: 2, value: '' } },
      ids: [],
    });
  });

  it('rejects a value duplicated within the file, case-insensitively', async () => {
    const id = new Types.ObjectId().toString();
    const result = await validateCustomIds([
      { rowNumber: 2, rawValue: id },
      { rowNumber: 3, rawValue: id.toUpperCase() },
    ]);
    expect(result).toEqual({
      error: {
        key: 'duplicateCustomId',
        params: { row: 3, value: id.toUpperCase() },
      },
      ids: [],
    });
  });

  it('rejects a value that already exists in the database, reporting the first offending row in file order', async () => {
    const existing = new Types.ObjectId();
    const formId = new Types.ObjectId();
    await Record.create({
      _id: existing,
      incrementalId: 'EXISTING-0000002',
      form: formId,
      data: {},
      _form: { _id: formId, name: 'test' },
    });
    const other = new Types.ObjectId().toString();

    const result = await validateCustomIds([
      { rowNumber: 2, rawValue: other },
      { rowNumber: 3, rawValue: existing.toString() },
    ]);

    expect(result).toEqual({
      error: {
        key: 'existingCustomId',
        params: { row: 3, value: existing.toString() },
      },
      ids: [],
    });
  });
});
