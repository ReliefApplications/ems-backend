import normalizeSortDescriptors from '@utils/schema/resolvers/Query/normalizeSortDescriptors';

describe('normalizeSortDescriptors', () => {
  it('returns an empty array when nothing is provided', () => {
    expect(normalizeSortDescriptors()).toEqual([]);
  });

  it('falls back to sortField/sortOrder when sortFields is absent', () => {
    expect(normalizeSortDescriptors('lastname', 'desc')).toEqual([
      { field: 'lastname', order: 'desc' },
    ]);
  });

  it('defaults sortOrder to asc when omitted', () => {
    expect(normalizeSortDescriptors('lastname')).toEqual([
      { field: 'lastname', order: 'asc' },
    ]);
  });

  it('prefers sortFields over sortField/sortOrder when non-empty', () => {
    const result = normalizeSortDescriptors('lastname', 'desc', [
      { field: 'priority_flag', order: 'asc' },
      { field: 'lastUpdatedDate', order: 'asc' },
      { field: 'lastname', order: 'asc' },
    ]);
    expect(result).toEqual([
      { field: 'priority_flag', order: 'asc' },
      { field: 'lastUpdatedDate', order: 'asc' },
      { field: 'lastname', order: 'asc' },
    ]);
  });

  it('falls back to sortField/sortOrder when sortFields is an empty array', () => {
    expect(normalizeSortDescriptors('lastname', 'asc', [])).toEqual([
      { field: 'lastname', order: 'asc' },
    ]);
  });

  it('filters out entries without a field name', () => {
    const result = normalizeSortDescriptors(undefined, undefined, [
      { field: 'priority_flag', order: 'asc' },
      { field: '', order: 'asc' },
      undefined as any,
    ]);
    expect(result).toEqual([{ field: 'priority_flag', order: 'asc' }]);
  });

  it('defaults an invalid or missing order to asc', () => {
    const result = normalizeSortDescriptors(undefined, undefined, [
      { field: 'priority_flag' },
      { field: 'lastname', order: 'invalid' as any },
    ]);
    expect(result).toEqual([
      { field: 'priority_flag', order: 'asc' },
      { field: 'lastname', order: 'asc' },
    ]);
  });
});
