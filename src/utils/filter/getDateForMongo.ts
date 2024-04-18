import {
  Placeholder,
  extractStringFromBrackets,
  REGEX_TODAY_PLUS,
  REGEX_TODAY_MINUS,
} from '../../const/placeholders';

/**
 * Gets from input date value the three dates used for filtering.
 *
 * @param value input date value
 * @returns calculated day, beginning of day, and ending of day
 */
export const getDateForMongo = (
  value: any
): { startDate: Date; endDate: Date } => {
  // today's date
  let startDate: Date;
  if (value === Placeholder.TODAY) {
    startDate = new Date();
    // today + number of days
  } else if (REGEX_TODAY_PLUS.test(value)) {
    const difference = parseInt(extractStringFromBrackets(value).split('+')[1]);
    startDate = new Date();
    startDate.setDate(startDate.getDate() + difference);
    // today - number of days
  } else if (REGEX_TODAY_MINUS.test(value)) {
    const difference = -parseInt(
      extractStringFromBrackets(value).split('-')[1]
    );
    startDate = new Date();
    startDate.setDate(startDate.getDate() + difference);
    // classic date
  } else {
    startDate = new Date(value);
  }
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);
  endDate.setMilliseconds(-1);
  return { startDate, endDate };
};
