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
 * @returns calculated day
 */
export const getDateForMongo = (value: any): string => {
  // today's date
  let date: Date;

  if (value === Placeholder.TODAY) {
    date = new Date();
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
  
  // Return the ISO string, if valid date, if not return empty string
  return isNaN(date.getTime()) ? '' : date.toISOString();
};
