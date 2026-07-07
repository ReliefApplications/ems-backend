import getTimeWithTimezone from '@utils/date/getTimeWithTimezone';

describe('getTimeWithTimezone', () => {
  let getOffsetSpy: jest.SpyInstance;
  let toLocaleTimeStringSpy: jest.SpyInstance;

  beforeEach(() => {
    // The timezone offset and locale time formatting depend on the machine's
    // environment, so they are stubbed to keep assertions deterministic.
    toLocaleTimeStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('10:30:00 AM');
    getOffsetSpy = jest.spyOn(Date.prototype, 'getTimezoneOffset');
  });

  afterEach(() => {
    getOffsetSpy.mockRestore();
    toLocaleTimeStringSpy.mockRestore();
  });

  it('should format a positive UTC offset with a + sign', () => {
    // -120 minutes => UTC+2
    getOffsetSpy.mockReturnValue(-120);
    expect(getTimeWithTimezone(new Date(), 'en-US')).toBe('10:30:00 AM UTC+2');
  });

  it('should format a negative UTC offset with a - sign', () => {
    // 300 minutes => UTC-5
    getOffsetSpy.mockReturnValue(300);
    expect(getTimeWithTimezone(new Date(), 'en-US')).toBe('10:30:00 AM UTC-5');
  });

  it('should omit the sign for a zero (UTC) offset', () => {
    getOffsetSpy.mockReturnValue(0);
    expect(getTimeWithTimezone(new Date(), 'en-US')).toBe('10:30:00 AM UTC0');
  });

  it('should pass the provided locale to toLocaleTimeString', () => {
    getOffsetSpy.mockReturnValue(0);
    getTimeWithTimezone(new Date(), 'fr-FR');
    expect(toLocaleTimeStringSpy).toHaveBeenCalledWith('fr-FR');
  });
});
