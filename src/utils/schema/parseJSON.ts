/** List of available date and time types */
const DATETIME_TYPES = ['Date', 'Datetime', 'Time', 'date', 'datetime', 'time'];

/**
 * Parse a JSON value to it type, including Date
 *
 * @param value The value as JSON to parse
 * @param type The wanted type
 * @returns The parsed value
 */
export const parseJSON = (value: string, type: string): any => {
  const parsedValue = JSON.parse(value);
  if (DATETIME_TYPES.includes(type)) {
    return new Date(parsedValue);
  }
  return parsedValue;
};
