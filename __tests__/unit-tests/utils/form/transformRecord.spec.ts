import { formatValue, transformRecord } from '@utils/form/transformRecord';

describe('formatValue', () => {
  it('converts date-like fields to Date objects', () => {
    for (const type of ['date', 'datetime', 'datetime-local']) {
      const value = formatValue({ type }, '2023-05-15');
      expect(value).toBeInstanceOf(Date);
      expect(value.toISOString()).toBe(new Date('2023-05-15').toISOString());
    }
  });

  it('joins text arrays into a string', () => {
    expect(formatValue({ type: 'text' }, ['a', 'b'])).toBe('a,b');
    expect(formatValue({ type: 'text' }, 'plain')).toBe('plain');
  });

  it('converts HH:mm time values to UTC dates', () => {
    const value = formatValue({ type: 'time' }, '10:30');
    expect(value).toBeInstanceOf(Date);
    expect(value.toISOString()).toBe('1970-01-01T10:30:00.000Z');
  });

  // Documents current behavior: a Date value on a time field falls through
  // the switch without returning, so the value is wiped to undefined
  it('returns undefined for time fields already holding a Date', () => {
    const date = new Date('1970-01-01T08:00:00.000Z');
    expect(formatValue({ type: 'time' }, date)).toBeUndefined();
  });

  it('keeps only name and content for file fields', () => {
    const files = [{ name: 'a.txt', content: 'abc', extra: true }];
    expect(formatValue({ type: 'file' }, files)).toEqual([
      { name: 'a.txt', content: 'abc' },
    ]);
  });

  it('keeps valid resource ids and drops malformed 12-character ones', () => {
    const validId = '507f1f77bcf86cd799439011';
    expect(formatValue({ type: 'resource' }, validId)).toBe(validId);
    // 12-character strings are a valid ObjectId input but do not round-trip
    expect(formatValue({ type: 'resource' }, 'aaaaaaaaaaaa')).toBeNull();
  });

  it('filters invalid ids out of resources arrays', () => {
    const validId = '507f1f77bcf86cd799439011';
    expect(formatValue({ type: 'resources' }, [validId, 'aaaaaaaaaaaa'])).toEqual(
      [validId]
    );
  });

  it('returns unchanged values for unknown field types', () => {
    expect(formatValue({ type: 'boolean' }, true)).toBe(true);
    expect(formatValue({ type: 'numeric' }, 42)).toBe(42);
  });
});

describe('transformRecord', () => {
  it('formats known fields and removes unknown ones', () => {
    const record: any = {
      startDate: '2023-05-15',
      tags: ['a', 'b'],
      ghost: 'should be removed',
    };
    const fields = [
      { name: 'startDate', type: 'date' },
      { name: 'tags', type: 'text' },
    ];
    const transformed: any = transformRecord(record, fields);
    expect(transformed.startDate).toBeInstanceOf(Date);
    expect(transformed.tags).toBe('a,b');
    expect(transformed).not.toHaveProperty('ghost');
  });
});
