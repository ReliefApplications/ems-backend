import getFilter from '@utils/filter/getFilter';
import getRecordFilter from '@utils/schema/resolvers/Query/getFilter';

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

describe('getFilter - draft default field', () => {
  /**
   * Builds a filter on the draft default field.
   *
   * @param operator filter operator
   * @param value filter value
   * @returns mongo filter
   */
  const draftFilter = (operator: string, value: boolean | string | null) =>
    getRecordFilter(
      { logic: 'and', filters: [{ field: 'draft', operator, value }] },
      FIELDS
    );

  it('matches submitted records, including records without the flag, for draft eq false', () => {
    expect(draftFilter('eq', false)).toEqual({
      $and: [{ draft: { $ne: true } }],
    });
    expect(draftFilter('neq', true)).toEqual({
      $and: [{ draft: { $ne: true } }],
    });
  });

  it('matches only drafts for draft eq true', () => {
    expect(draftFilter('eq', true)).toEqual({ $and: [{ draft: true }] });
    expect(draftFilter('neq', false)).toEqual({ $and: [{ draft: true }] });
  });

  it('treats a null value like false', () => {
    expect(draftFilter('eq', null)).toEqual({
      $and: [{ draft: { $ne: true } }],
    });
    expect(draftFilter('neq', null)).toEqual({ $and: [{ draft: true }] });
  });

  it('accepts string boolean values', () => {
    expect(draftFilter('eq', 'false')).toEqual({
      $and: [{ draft: { $ne: true } }],
    });
    expect(draftFilter('eq', 'true')).toEqual({ $and: [{ draft: true }] });
  });

  it('does not treat draft as a data field', () => {
    const result = draftFilter('eq', true);
    expect(JSON.stringify(result)).not.toContain('data.draft');
  });
});
