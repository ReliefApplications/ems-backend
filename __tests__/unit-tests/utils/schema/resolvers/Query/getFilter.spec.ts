import getFilter, {
  extractFilterFields,
  isUsedInFilter,
} from '@utils/schema/resolvers/Query/getFilter';

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
];

/** Fields of the related (emergency) resource */
const EMERGENCY_FIELDS = [
  { name: 'name', type: 'text' },
  { name: 'grade', type: 'dropdown', choices: [] },
];

const CONTEXT = {
  resourceFieldsById: { emergencyResourceId: EMERGENCY_FIELDS },
};

/**
 * Wraps per-field search rules into the composite global search filter sent
 * by the frontend widgets.
 *
 * @param rules per-field search rules
 * @returns composite filter
 */
const globalSearch = (rules: any[]) => ({
  logic: 'and',
  filters: [
    { logic: 'or', field: '_globalSearch', operator: 'contains', value: rules },
  ],
});

/** Mongo filter matching no record */
const MATCH_NOTHING = { _id: { $exists: false } };

describe('extractFilterFields', () => {
  it('extracts fields from regular composite filters', () => {
    const filter = {
      logic: 'and',
      filters: [
        { field: 'title', operator: 'contains', value: 'a' },
        {
          logic: 'or',
          filters: [{ field: 'emergency.name', operator: 'eq', value: 'b' }],
        },
      ],
    };
    expect(extractFilterFields(filter)).toEqual(['title', 'emergency.name']);
  });

  it('extracts the per-field rules of a global search instead of _globalSearch', () => {
    const filter = globalSearch([
      { field: 'title', operator: 'contains', value: 'a' },
      { field: 'emergency.name', operator: 'contains', value: 'a' },
    ]);
    expect(extractFilterFields(filter)).toEqual(['title', 'emergency.name']);
  });
});

describe('isUsedInFilter', () => {
  it('finds a field referenced by a regular rule', () => {
    const filter = {
      logic: 'and',
      filters: [{ field: 'total_teams', operator: 'eq', value: 3 }],
    };
    expect(isUsedInFilter(filter, 'total_teams')).toBe(true);
    expect(isUsedInFilter(filter, 'title')).toBe(false);
  });

  it('finds a field referenced inside a global search rule', () => {
    const filter = globalSearch([
      { field: 'total_teams', operator: 'eq', value: 3 },
    ]);
    expect(isUsedInFilter(filter, 'total_teams')).toBe(true);
    expect(isUsedInFilter(filter, 'title')).toBe(false);
  });
});

describe('getFilter - global search expansion', () => {
  it('expands per-field rules into an $or with per-type operators', () => {
    const filter = globalSearch([
      { field: 'title', operator: 'contains', value: 'cholera' },
      { field: 'count', operator: 'eq', value: 12 },
      { field: 'tags', operator: 'contains', value: ['cholera'] },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const or = result.$and[0].$or;
    expect(or).toEqual([
      { 'data.title': { $regex: 'cholera', $options: 'i' } },
      // numeric eq matches both string and number storage
      {
        $or: [
          { 'data.count': { $eq: '12' } },
          { 'data.count': { $eq: 12 } },
        ],
      },
      { 'data.tags': { $all: ['cholera'] } },
    ]);
  });

  it('keeps default fields flat (incrementalId searchable)', () => {
    const filter = globalSearch([
      { field: 'incrementalId', operator: 'contains', value: '2026-E00000017' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result.$and[0].$or).toEqual([
      { incrementalId: { $regex: '2026-E00000017', $options: 'i' } },
    ]);
  });

  it('maps related-resource subfields onto the lookup alias', () => {
    const filter = globalSearch([
      { field: 'emergency.name', operator: 'contains', value: 'cholera' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result.$and[0].$or).toEqual([
      { '_emergency.data.name': { $regex: 'cholera', $options: 'i' } },
    ]);
  });

  it('supports in operator for choice values matched by display text', () => {
    const filter = globalSearch([
      { field: 'status', operator: 'in', value: ['approved', 'pending'] },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const rule = result.$and[0].$or[0];
    // values are matched both as raw strings and as ObjectId casts
    expect(JSON.stringify(rule)).toContain('"data.status"');
    expect(JSON.stringify(rule)).toContain('approved');
    expect(JSON.stringify(rule)).toContain('pending');
  });

  it('escapes regex special characters in the searched string', () => {
    const filter = globalSearch([
      { field: 'title', operator: 'contains', value: '(test' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result.$and[0].$or).toEqual([
      { 'data.title': { $regex: '\\(test', $options: 'i' } },
    ]);
    // the escaped pattern must be a valid regex matching the literal string
    const pattern = result.$and[0].$or[0]["data.title"].$regex;
    expect(new RegExp(pattern).test('a (test b')).toBe(true);
  });

  it('drops date rules that produce null comparisons', () => {
    const filter = globalSearch([
      { field: 'title', operator: 'contains', value: 'hello' },
      { field: 'start_date', operator: 'eq', value: 'hello' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const or = result.$and[0].$or;
    expect(or).toHaveLength(1);
    expect(or[0]).toEqual({
      'data.title': { $regex: 'hello', $options: 'i' },
    });
  });

  it('matches nothing when no rule survives, instead of matching everything', () => {
    const filter = globalSearch([
      { field: 'start_date', operator: 'eq', value: 'hello' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result.$and[0]).toEqual(MATCH_NOTHING);
  });

  it('matches nothing when the global search has no rules', () => {
    const result = getFilter(globalSearch([]), FIELDS, CONTEXT);
    expect(result.$and[0]).toEqual(MATCH_NOTHING);
  });

  it('searches people fields on their name/email subfields', () => {
    const filter = globalSearch([
      { field: 'focal_point', operator: 'contains', value: 'doe' },
      { field: 'team_members', operator: 'contains', value: 'doe' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const expectedPersonMatch = (field: string) => ({
      $and: [
        {
          $or: [
            { [`data.${field}.firstname`]: { $regex: 'doe', $options: 'i' } },
            { [`data.${field}.lastname`]: { $regex: 'doe', $options: 'i' } },
            {
              [`data.${field}.emailaddress`]: { $regex: 'doe', $options: 'i' },
            },
          ],
        },
      ],
    });
    expect(result.$and[0].$or).toEqual([
      expectedPersonMatch('focal_point'),
      expectedPersonMatch('team_members'),
    ]);
  });

  it('requires every word of a multi-word people search to match', () => {
    const filter = globalSearch([
      { field: 'focal_point', operator: 'contains', value: 'john doe' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const personRule = result.$and[0].$or[0];
    expect(personRule.$and).toHaveLength(2);
    expect(JSON.stringify(personRule.$and[0])).toContain('john');
    expect(JSON.stringify(personRule.$and[1])).toContain('doe');
  });

  it('is not hijacked by a leading numeric rule (legacy behavior)', () => {
    const filter = globalSearch([
      { field: 'count', operator: 'eq', value: 12 },
      { field: 'incrementalId', operator: 'contains', value: '12' },
      { field: 'emergency.name', operator: 'contains', value: '12' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    const or = result.$and[0].$or;
    // incrementalId stays flat and emergency.name uses the lookup alias —
    // the legacy code rewrote every rule to data.<field> $eq
    expect(or[1]).toEqual({
      incrementalId: { $regex: '12', $options: 'i' },
    });
    expect(or[2]).toEqual({
      '_emergency.data.name': { $regex: '12', $options: 'i' },
    });
  });
});
