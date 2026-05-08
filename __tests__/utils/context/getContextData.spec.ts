import mongoose from 'mongoose';
import { Record, Resource } from '@models';
import { getContextDataForRecord } from '@utils/context/getContextData';

describe('getContextDataForRecord', () => {
  it('includes the record incrementalId in the context data', async () => {
    const resource = new Resource({
      name: 'Events',
      fields: [
        {
          name: 'eventSignalId',
          type: 'text',
        },
      ],
    });

    const record = new Record({
      incrementalId: '2026-D0000001',
      form: new mongoose.Types.ObjectId(),
      _form: new mongoose.Types.ObjectId(),
      data: {
        eventSignalId: 'signal-1',
      },
    });

    const contextData = await getContextDataForRecord(resource, record, {});

    expect(contextData).toEqual({
      eventSignalId: 'signal-1',
      incrementalId: '2026-D0000001',
    });
  });
});
