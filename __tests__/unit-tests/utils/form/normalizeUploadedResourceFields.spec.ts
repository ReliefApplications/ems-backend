import { Record } from '@models';
import { normalizeUploadedResourceFields } from '@utils/form/normalizeUploadedResourceFields';
import mongoose from 'mongoose';

/** Resource configured on the relationship fields. */
const linkedResourceId = new mongoose.Types.ObjectId();
/** Different resource used to verify resource-scoped validation. */
const otherResourceId = new mongoose.Types.ObjectId();
/** Existing record in the linked resource. */
const validRecordId = new mongoose.Types.ObjectId();
/** Second existing record in the linked resource. */
const anotherValidRecordId = new mongoose.Types.ObjectId();

describe('normalizeUploadedResourceFields', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converts a valid record ID from the linked resource to an ObjectId', async () => {
    const distinct = jest
      .spyOn(Record, 'distinct')
      .mockResolvedValue([validRecordId.toString()]);
    const data = { linkedRecord: validRecordId.toString() };

    await normalizeUploadedResourceFields(data, [
      { name: 'linkedRecord', type: 'resource', resource: linkedResourceId },
    ]);

    expect(data.linkedRecord).toEqual(validRecordId);
    expect(distinct).toHaveBeenCalledWith('_id', {
      _id: { $in: [validRecordId.toString()] },
      resource: linkedResourceId,
    });
  });

  it('removes malformed and unlinked single-resource IDs', async () => {
    const distinct = jest.spyOn(Record, 'distinct');
    const data = {
      malformed: 'not-an-object-id',
      unlinked: validRecordId.toString(),
    };
    distinct.mockResolvedValueOnce([]);

    await normalizeUploadedResourceFields(data, [
      { name: 'malformed', type: 'resource', resource: linkedResourceId },
      { name: 'unlinked', type: 'resource', resource: otherResourceId },
    ]);

    expect(data).toEqual({});
    expect(distinct).toHaveBeenCalledTimes(1);
  });

  it('keeps only valid linked IDs from semicolon-separated resource lists', async () => {
    jest
      .spyOn(Record, 'distinct')
      .mockResolvedValue([
        validRecordId.toString(),
        anotherValidRecordId.toString(),
      ]);
    const data = {
      linkedRecords: `${validRecordId}; not-an-object-id; ${anotherValidRecordId}; ${new mongoose.Types.ObjectId()}`,
    };

    await normalizeUploadedResourceFields(data, [
      { name: 'linkedRecords', type: 'resources', resource: linkedResourceId },
    ]);

    expect(data.linkedRecords).toEqual([validRecordId, anotherValidRecordId]);
  });

  it('removes resource lists when none of their IDs belong to the linked resource', async () => {
    jest.spyOn(Record, 'distinct').mockResolvedValue([]);
    const data = { linkedRecords: `${validRecordId};${anotherValidRecordId}` };

    await normalizeUploadedResourceFields(data, [
      { name: 'linkedRecords', type: 'resources', resource: linkedResourceId },
    ]);

    expect(data).toEqual({});
  });
});
