import jsonpath from '@utils/jsonpath';

describe('jsonpath utility', () => {
  const data = {
    groups: [
      { id: 'group-1', title: 'Group 1' },
      { id: 'group-2', title: 'Group 2' },
    ],
  };

  it('returns all matching values for a JSONPath query', () => {
    expect(jsonpath.query<string>(data, '$.groups[*].id')).toEqual([
      'group-1',
      'group-2',
    ]);
  });

  it('returns the first matching value for a JSONPath value lookup', () => {
    expect(jsonpath.value<string>(data, '$.groups[0].title')).toBe('Group 1');
  });

  it('returns undefined when a JSONPath value lookup has no result', () => {
    expect(jsonpath.value<string>(data, '$.groups[2].title')).toBeUndefined();
  });
});
