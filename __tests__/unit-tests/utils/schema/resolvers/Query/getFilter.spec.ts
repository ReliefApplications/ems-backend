import getFilter from '@utils/schema/resolvers/Query/getFilter';

/** Fields of the queried resource */
const FIELDS = [
  { name: 'title', type: 'text' },
  { name: 'count', type: 'numeric' },
  { name: 'status', type: 'dropdown', choices: [] },
  { name: 'tags', type: 'tagbox', choices: [] },
  { name: 'start_date', type: 'date' },
  { name: 'total_teams', type: 'numeric', isCalculated: true },
  { name: 'emergency', type: 'resource', resource: 'emergencyResourceId' },
  { name: 'focal_point', type: 'people-dropdown' },
  { name: 'team_members', type: 'people-tagbox' },
  { name: 'documents', type: 'file' },
];

/** Fields of the related (emergency) resource */
const EMERGENCY_FIELDS = [
  { name: 'name', type: 'text' },
  { name: 'name_pt', type: 'text', translateField: 'name', translateTo: 'pt' },
  { name: 'grade', type: 'dropdown', choices: [] },
];

const CONTEXT = {
  resourceFieldsById: { emergencyResourceId: EMERGENCY_FIELDS },
};

describe('getFilter - isempty / isnotempty operators', () => {
  it('isnotempty on a tagbox field excludes null values and empty arrays', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'tags', operator: 'isnotempty', value: null }],
      },
      FIELDS,
      CONTEXT
    );
    expect(result).toEqual({
      $and: [{ 'data.tags': { $exists: true, $nin: [null, []] } }],
    });
  });

  it('isnotempty on a text field excludes null values and empty strings', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'title', operator: 'isnotempty', value: null }],
      },
      FIELDS,
      CONTEXT
    );
    expect(result).toEqual({
      $and: [{ 'data.title': { $exists: true, $nin: [null, ''] } }],
    });
  });

  it('isempty on a tagbox field matches missing, null and empty array values', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'tags', operator: 'isempty', value: null }],
      },
      FIELDS,
      CONTEXT
    );
    expect(result).toEqual({
      $and: [
        {
          $or: [
            { 'data.tags': { $exists: true, $size: 0 } },
            { 'data.tags': { $exists: false } },
            { 'data.tags': { $eq: null } },
          ],
        },
      ],
    });
  });
});
