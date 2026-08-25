import getFilter from '@utils/filter/getFilter';

/** Fields of the filtered entity */
const FIELDS = [
  { name: 'title', type: 'text' },
  { name: 'tags', type: 'tagbox', choices: [] },
];

describe('getFilter - isempty / isnotempty operators', () => {
  it('isnotempty on a tagbox field excludes null values and empty arrays', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'tags', operator: 'isnotempty', value: null }],
      },
      FIELDS
    );
    expect(result).toEqual({
      $and: [{ tags: { $exists: true, $nin: [null, []] } }],
    });
  });

  it('isnotempty on a text field excludes null values and empty strings', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'title', operator: 'isnotempty', value: null }],
      },
      FIELDS
    );
    expect(result).toEqual({
      $and: [{ title: { $exists: true, $nin: [null, ''] } }],
    });
  });

  it('isempty on a tagbox field matches missing, null and empty array values', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'tags', operator: 'isempty', value: null }],
      },
      FIELDS
    );
    expect(result).toEqual({
      $and: [
        {
          $or: [
            { tags: { $exists: true, $size: 0 } },
            { tags: { $exists: false } },
            { tags: { $eq: null } },
          ],
        },
      ],
    });
  });
});
