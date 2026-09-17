import { extractFields } from '@utils/form/extractFields';

describe('extractFields', () => {
  it('skips field history questions without requiring a data field', async () => {
    const fields = [];

    await expect(
      extractFields(
        {
          elements: [
            {
              type: 'text',
              name: 'before',
              valueName: 'before',
            },
            {
              type: 'field-history',
              name: 'question1',
              field: 'status',
            },
            {
              type: 'text',
              name: 'after',
              valueName: 'after',
            },
          ],
        },
        fields,
        true
      )
    ).resolves.toBeUndefined();

    expect(fields).toEqual([
      expect.objectContaining({ name: 'before' }),
      expect.objectContaining({ name: 'after' }),
    ]);
  });
});
