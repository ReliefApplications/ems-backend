import { Placeholder } from '../../const/placeholders';

/**
 * Gets from input time value a time value display.
 *
 * @param value record value
 * @returns calculated time
 */
export const getTimeForMongo = (value: any): Date => {
  if (value === Placeholder.NOW) {
    return new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'Europe/Berlin',
      })
    );
  } else if (value.match(/^\d\d:\d\d$/)) {
    const hours = value.slice(0, 2);
    const minutes = value.slice(3);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes));
  } else {
    return new Date(value);
  }
};
