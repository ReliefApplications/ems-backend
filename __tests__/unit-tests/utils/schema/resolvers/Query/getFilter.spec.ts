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

  it('resolves translation siblings of related-resource subfields', () => {
    const filter = globalSearch([
      { field: 'emergency.name', operator: 'contains', value: 'colera' },
    ]);
    // Locale with a translation sibling on the related resource
    const result = getFilter(filter, FIELDS, { ...CONTEXT, locale: 'pt' });
    expect(result.$and[0].$or).toEqual([
      { '_emergency.data.name_pt': { $regex: 'colera', $options: 'i' } },
    ]);
    // Locale without a sibling falls back to the source subfield
    const fallback = getFilter(filter, FIELDS, { ...CONTEXT, locale: 'fr' });
    expect(fallback.$and[0].$or).toEqual([
      { '_emergency.data.name': { $regex: 'colera', $options: 'i' } },
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

  it('searches file fields on the file name', () => {
    const filter = globalSearch([
      { field: 'documents', operator: 'contains', value: 'report' },
    ]);
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result.$and[0].$or).toEqual([
      { 'data.documents.name': { $regex: 'report', $options: 'i' } },
    ]);
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

describe('getFilter - user attribute & people current-user filters', () => {
  const USER_CONTEXT = {
    ...CONTEXT,
    user: {
      oid: 'aad-object-id',
      username: 'John.Doe@who.int',
      attributes: {
        region: 'North',
        'country.iso3code': 'TUN',
      },
    },
  };

  it('resolves dot-notation attribute keys against user attributes', () => {
    const filter = {
      logic: 'and',
      filters: [
        { field: '$attribute.country.iso3code', operator: 'eq', value: 'title' },
      ],
    };
    const result = getFilter(filter, FIELDS, USER_CONTEXT);
    expect(result).toEqual({ $and: [{ 'data.title': 'TUN' }] });
  });

  it('matches nothing when an attribute filter has no user in context', () => {
    const filter = {
      logic: 'and',
      filters: [
        { field: '$attribute.region', operator: 'eq', value: 'title' },
      ],
    };
    const result = getFilter(filter, FIELDS, CONTEXT);
    expect(result).toEqual({ $and: [MATCH_NOTHING] });
  });

  it('resolves literal attribute comparisons to match-all or match-none', () => {
    const matching = getFilter(
      {
        logic: 'and',
        filters: [
          {
            field: '$attribute.region',
            operator: 'eq',
            value: 'North',
            valueSource: 'literal',
          },
        ],
      },
      FIELDS,
      USER_CONTEXT
    );
    expect(matching).toEqual({ $and: [{ _id: { $exists: true } }] });

    const notMatching = getFilter(
      {
        logic: 'and',
        filters: [
          {
            field: '$attribute.region',
            operator: 'in',
            value: 'South, East',
            valueSource: 'literal',
          },
        ],
      },
      FIELDS,
      USER_CONTEXT
    );
    expect(notMatching).toEqual({ $and: [MATCH_NOTHING] });
  });

  it('matches the connected user in people fields with the me value', () => {
    const expected = (fieldName: string) => ({
      $or: [
        { [`data.${fieldName}.userid`]: 'aad-object-id' },
        {
          [`data.${fieldName}.emailaddress`]: {
            $regex: '^John\\.Doe@who\\.int$',
            $options: 'i',
          },
        },
      ],
    });
    for (const fieldName of ['focal_point', 'team_members']) {
      const result = getFilter(
        {
          logic: 'and',
          filters: [{ field: fieldName, operator: 'eq', value: 'me' }],
        },
        FIELDS,
        USER_CONTEXT
      );
      expect(result).toEqual({ $and: [expected(fieldName)] });
    }
  });

  it('matches nothing on people me filters without a connected user', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'focal_point', operator: 'eq', value: 'me' }],
      },
      FIELDS,
      CONTEXT
    );
    expect(result).toEqual({ $and: [MATCH_NOTHING] });
  });

  it('keeps text searches for the word me on people fields unchanged', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: 'focal_point', operator: 'contains', value: 'me' }],
      },
      FIELDS,
      USER_CONTEXT
    );
    expect(result).toEqual({
      $and: [
        {
          $and: [
            {
              $or: [
                { 'data.focal_point.firstname': { $regex: 'me', $options: 'i' } },
                { 'data.focal_point.lastname': { $regex: 'me', $options: 'i' } },
                {
                  'data.focal_point.emailaddress': {
                    $regex: 'me',
                    $options: 'i',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe('getFilter - attribute field comparisons robustness', () => {
  const USER_CONTEXT = {
    ...CONTEXT,
    user: {
      attributes: {
        region: 'EURO',
      },
    },
  };

  it('builds an anchored string regex for field-mode in / notin', () => {
    const inResult = getFilter(
      {
        logic: 'and',
        filters: [{ field: '$attribute.region', operator: 'in', value: 'title' }],
      },
      FIELDS,
      USER_CONTEXT
    );
    expect(inResult).toEqual({
      $and: [{ 'data.title': { $regex: '^EURO$', $options: 'i' } }],
    });

    const notinResult = getFilter(
      {
        logic: 'and',
        filters: [
          { field: '$attribute.region', operator: 'notin', value: 'title' },
        ],
      },
      FIELDS,
      USER_CONTEXT
    );
    expect(notinResult).toEqual({
      $and: [
        { 'data.title': { $not: { $regex: '^EURO$', $options: 'i' } } },
      ],
    });
  });

  it('also matches the numeric form of numeric attributes (in / notin / eq)', () => {
    const numericContext = {
      ...CONTEXT,
      user: { attributes: { 'region.id': '4' } },
    };
    const rule = (operator: string) => ({
      logic: 'and',
      filters: [
        { field: '$attribute.region.id', operator, value: 'tags' },
      ],
    });

    // record stores e.g. tags: [4, 3, 5] (numbers) or ['4'] (strings)
    expect(getFilter(rule('in'), FIELDS, numericContext)).toEqual({
      $and: [
        {
          $or: [
            { 'data.tags': { $regex: '^4$', $options: 'i' } },
            { 'data.tags': 4 },
          ],
        },
      ],
    });
    expect(getFilter(rule('notin'), FIELDS, numericContext)).toEqual({
      $and: [
        {
          $and: [
            { 'data.tags': { $not: { $regex: '^4$', $options: 'i' } } },
            { 'data.tags': { $ne: 4 } },
          ],
        },
      ],
    });
    expect(getFilter(rule('eq'), FIELDS, numericContext)).toEqual({
      $and: [
        {
          $or: [
            { 'data.tags': { $eq: '4' } },
            { 'data.tags': { $eq: 4 } },
          ],
        },
      ],
    });
  });

  it('matches nothing on field comparisons when the user lacks the attribute', () => {
    for (const operator of ['eq', 'neq', 'in', 'notin']) {
      const result = getFilter(
        {
          logic: 'and',
          filters: [
            // 'region.name' is not part of the user attributes
            { field: '$attribute.region.name', operator, value: 'title' },
          ],
        },
        FIELDS,
        USER_CONTEXT
      );
      expect(result).toEqual({ $and: [MATCH_NOTHING] });
    }
  });

  it('escapes regex metacharacters in attribute values', () => {
    const result = getFilter(
      {
        logic: 'and',
        filters: [{ field: '$attribute.region', operator: 'in', value: 'title' }],
      },
      FIELDS,
      { ...CONTEXT, user: { attributes: { region: 'EURO (west)' } } }
    );
    expect(result).toEqual({
      $and: [
        { 'data.title': { $regex: '^EURO \\(west\\)$', $options: 'i' } },
      ],
    });
  });
});
