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
): { date: Date; startDate: Date; endDate: Date } => {
  // today's date
  let date: Date;
  let startDate: Date;
  let endDate: Date;
  if (value === Placeholder.TODAY) {
    date = new Date();
    startDate = new Date(date);
    endDate = new Date(date);
    // today + number of days
  } else if (REGEX_TODAY_PLUS.test(value)) {
    const difference = parseInt(extractStringFromBrackets(value).split('+')[1]);
    date = new Date();
    date.setDate(date.getDate() + difference);
    // today - number of days
  } else if (REGEX_TODAY_MINUS.test(value)) {
    const difference = -parseInt(
      extractStringFromBrackets(value).split('-')[1]
    );
    date = new Date();
    date.setDate(date.getDate() + difference);
    // classic date
  } else {
    date = new Date(value);
  }
  startDate = new Date(date);
  endDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return {
    date,
    startDate,
    endDate,
  };
};
