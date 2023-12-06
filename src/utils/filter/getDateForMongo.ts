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
export const getDateForMongo = (value: any) => {
  // today's date
  let date: Date = new Date();

  if (value === Placeholder.TODAY) {
    // today + number of days
  } else if (REGEX_TODAY_PLUS.test(value)) {
    const difference = parseInt(extractStringFromBrackets(value).split('+')[1]);
    date.setDate(date.getDate() + difference);
    // today - number of days
  } else if (REGEX_TODAY_MINUS.test(value)) {
    const difference = -parseInt(
      extractStringFromBrackets(value).split('-')[1]
    );
    date.setDate(date.getDate() + difference);
    // classic date
  } else {
    date = new Date(value);
  }

  return date;
};
