import { extractFields } from '@utils/form/extractFields';

describe('extractFields', () => {
  it('extracts data-bearing questions, including nested panels', async () => {
    const fields: any[] = [];
    await extractFields(
      {
        elements: [
          { type: 'text', name: 'q1', valueName: 'first_name' },
          {
            type: 'panel',
            name: 'panel',
            elements: [{ type: 'file', name: 'q2', valueName: 'attachments' }],
          },
        ],
      },
      fields,
      true
    );

    expect(
      fields.map((field) => [field.name, field.type, field.isCore])
    ).toEqual([
      ['first_name', 'text', true],
      ['attachments', 'file', true],
    ]);
  });

  it('skips the questions holding no data of their own', async () => {
    const fields: any[] = [];
    await extractFields(
      {
        elements: [
          { type: 'filesupload', name: 'upload', targetField: 'attachments' },
          { type: 'filesmanagement', name: 'management' },
          { type: 'field-history', name: 'history' },
          { type: 'resources', name: 'related', displayOnly: true },
          { type: 'file', name: 'q1', valueName: 'attachments' },
        ],
      },
      fields,
      false
    );

    expect(fields.map((field) => field.name)).toEqual(['attachments']);
  });

  it('still requires a data field on the other questions', async () => {
    await expect(
      extractFields({ elements: [{ type: 'text', name: 'q1' }] }, [], false)
    ).rejects.toThrow();
  });
});
