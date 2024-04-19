import {
  extractStringFromBrackets,
  REGEX_TODAY_PLUS,
  REGEX_TODAY_MINUS,
  isUsingTodayPlaceholder,
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
  if (isUsingTodayPlaceholder(value)) {
    startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    // today + number of days
    if (REGEX_TODAY_PLUS.test(value)) {
      const difference = parseInt(
        extractStringFromBrackets(value).split('+')[1]
      );
      startDate.setDate(startDate.getDate() + difference);
      // today - number of days
    } else if (REGEX_TODAY_MINUS.test(value)) {
      const difference = -parseInt(
        extractStringFromBrackets(value).split('-')[1]
      );
      startDate.setDate(startDate.getDate() + difference);
    } // classic date
  } else {
    startDate = new Date(value);
  }
  const endDate = new Date(startDate);
  // Should set endDate to the same day than startDate, at 23:59:59:999
  endDate.setDate(startDate.getDate() + 1);
  endDate.setMilliseconds(-1);
  return { startDate, endDate };
};
