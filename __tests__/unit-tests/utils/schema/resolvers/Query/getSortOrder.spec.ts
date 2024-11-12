import decodeSortOrder from '@utils/schema/resolvers/Query/getSortOrder';

describe('decodeSortOrder', () => {
  it('should return 1 for ascending order', () => {
    const result = decodeSortOrder('asc');
    expect(result).toBe(1);
  });

  it('should return -1 for descending order', () => {
    const result = decodeSortOrder('desc');
    expect(result).toBe(-1);
  });
});
