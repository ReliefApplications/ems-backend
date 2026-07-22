import { getTimeForMongo } from '@utils/filter/getTimeForMongo';
import { Placeholder } from '@const/placeholders';

describe('getTimeForMongo', () => {
  it('converts HH:mm values to a UTC date on the epoch day', () => {
    expect(getTimeForMongo('10:30').toISOString()).toBe(
      '1970-01-01T10:30:00.000Z'
    );
    expect(getTimeForMongo('00:00').toISOString()).toBe(
      '1970-01-01T00:00:00.000Z'
    );
    expect(getTimeForMongo('23:59').toISOString()).toBe(
      '1970-01-01T23:59:00.000Z'
    );
  });

  it('parses other values as regular dates', () => {
    const value = getTimeForMongo('2023-05-15T10:30:00.000Z');
    expect(value.toISOString()).toBe('2023-05-15T10:30:00.000Z');
  });

  it('returns a valid date for the {{now}} placeholder', () => {
    const value = getTimeForMongo(Placeholder.NOW);
    expect(value).toBeInstanceOf(Date);
    expect(Number.isNaN(value.getTime())).toBe(false);
  });
});
