/**
 * Date/Time
 * Formats to m/d/yy, h:mm AM/PM UTC
 */
export const dateTimeLocale: Intl.DateTimeFormatOptions = {
  month: 'numeric',
  day: 'numeric',
  year: '2-digit',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
  timeZoneName: 'short',
};

/**
 * Date
 * Formats to m/d/yy, UTC
 */
export const dateLocale: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  timeZoneName: 'short',
  month: 'numeric',
  day: 'numeric',
  year: '2-digit',
};

/**
 * Time
 * Formats to h:mm AM/PM UTC
 */
export const timeLocale: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  timeZoneName: 'short',
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * Date
 * Formats to m/d/yy
 */
export const inthelastDateLocale: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  month: 'numeric',
  day: 'numeric',
  year: '2-digit',
};
