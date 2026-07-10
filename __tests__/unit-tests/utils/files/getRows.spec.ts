import { getRows } from '@utils/files/getRows';

/** Choice list with a `ua` translation for each label. */
const CHOICES = [
  { value: 'New', text: { default: 'New request received', ua: 'Нова заявка отримана' } },
  { value: 'Closed', text: { default: 'Closed', ua: 'Завершено' } },
];

describe('getRows - locale translation', () => {
  it('translates dropdown choices to the requested locale', async () => {
    const columns = [
      {
        type: 'dropdown',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = await getRows(columns, [{ data: { status: 'New' } }], 'uk');
    expect(rows).toEqual([{ status: 'Нова заявка отримана' }]);
  });

  it('falls back to the default text when no locale is provided', async () => {
    const columns = [
      {
        type: 'dropdown',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = await getRows(columns, [{ data: { status: 'New' } }]);
    expect(rows).toEqual([{ status: 'New request received' }]);
  });

  it('translates multi-select (tagbox) choices to the requested locale', async () => {
    const columns = [
      {
        type: 'tagbox',
        field: 'statuses',
        name: 'statuses',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = await getRows(
      columns,
      [{ data: { statuses: ['New', 'Closed'] } }],
      'uk'
    );
    expect(rows).toEqual([{ statuses: 'Нова заявка отримана,Завершено' }]);
  });
});
