/**
 * Create a string displaying the time of passed date in the following format:
 * HH:MM UTC+N  with N standing for the offset of locale timezone with UTC.
 *
 * @param date Input date.
 * @param locale Locale needed to compute the correct time format.
 * @returns Time string.
 */
const getTimeWithTimezone = (date: Date, locale: string): string => {
  const offset = -date.getTimezoneOffset() / 60;
  const operator = offset > 0 ? '+' : '-';
  return `${date.toLocaleTimeString(locale)} UTC${
    offset ? operator : ''
  }${Math.abs(offset)}`;
};

export default getTimeWithTimezone;
