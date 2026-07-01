import { getRowsFromMeta } from '@utils/files/getRowsFromMeta';

/** Builds a choice list with a `ua` translation for each label. */
const CHOICES = [
  { value: 'New', text: { default: 'New request received', ua: 'Нова заявка отримана' } },
  { value: 'Closed', text: { default: 'Closed', ua: 'Завершено' } },
];

describe('getRowsFromMeta - locale translation', () => {
  it('translates dropdown choices to the requested locale', () => {
    const columns: any[] = [
      {
        type: 'dropdown',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = getRowsFromMeta(columns, [{ status: 'New' }], false, 'uk');
    expect(rows).toEqual([{ status: 'Нова заявка отримана' }]);
  });

  it('falls back to the default text when no locale is provided', () => {
    const columns: any[] = [
      {
        type: 'dropdown',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = getRowsFromMeta(columns, [{ status: 'New' }]);
    expect(rows).toEqual([{ status: 'New request received' }]);
  });

  it('translates multi-select (checkbox) choices to the requested locale', () => {
    const columns: any[] = [
      {
        type: 'checkbox',
        field: 'statuses',
        name: 'statuses',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = getRowsFromMeta(
      columns,
      [{ statuses: ['New', 'Closed'] }],
      false,
      'uk'
    );
    expect(rows).toEqual([{ statuses: 'Нова заявка отримана,Завершено' }]);
  });

  it('translates radiogroup choices for email exports', () => {
    const columns: any[] = [
      {
        type: 'radiogroup',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES } },
      },
    ];
    const rows = getRowsFromMeta(columns, [{ status: 'Closed' }], true, 'uk');
    expect(rows).toEqual([{ status: 'Завершено' }]);
  });

  it('does not translate reference-data dropdowns (graphQLFieldName present)', () => {
    const columns: any[] = [
      {
        type: 'dropdown',
        field: 'status',
        name: 'status',
        meta: { field: { choices: CHOICES, graphQLFieldName: 'status' } },
      },
    ];
    const rows = getRowsFromMeta(columns, [{ status: 'New' }], false, 'uk');
    expect(rows).toEqual([{ status: 'New' }]);
  });
});
