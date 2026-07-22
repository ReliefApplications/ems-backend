import { getDateForMongo } from '@utils/filter/getDateForMongo';

describe('getDateForMongo', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-10T15:30:45.123'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns the whole current day for {{today}}', () => {
    const { startDate, endDate } = getDateForMongo('{{today}}');
    const expectedStart = new Date('2026-07-10T15:30:45.123');
    expectedStart.setHours(0, 0, 0, 0);
    expect(startDate.getTime()).toBe(expectedStart.getTime());
    expect(endDate.getTime()).toBe(
      expectedStart.getTime() + 24 * 60 * 60 * 1000 - 1
    );
  });

  it('shifts the day forward for {{today+n}}', () => {
    const { startDate } = getDateForMongo('{{today+3}}');
    const expected = new Date('2026-07-13T15:30:45.123');
    expected.setHours(0, 0, 0, 0);
    expect(startDate.getTime()).toBe(expected.getTime());
  });

  it('shifts the day backward for {{today-n}}, with optional spaces', () => {
    const { startDate } = getDateForMongo('{{today - 2}}');
    const expected = new Date('2026-07-08T15:30:45.123');
    expected.setHours(0, 0, 0, 0);
    expect(startDate.getTime()).toBe(expected.getTime());
  });

  it('returns the current instant for {{now}}', () => {
    const { startDate } = getDateForMongo('{{now}}');
    expect(startDate.getTime()).toBe(
      new Date('2026-07-10T15:30:45.123').getTime()
    );
  });

  it('parses plain date values', () => {
    const { startDate, endDate } = getDateForMongo('2023-05-15');
    expect(startDate.getTime()).toBe(new Date('2023-05-15').getTime());
    expect(endDate.getTime()).toBe(
      startDate.getTime() + 24 * 60 * 60 * 1000 - 1
    );
  });
});
