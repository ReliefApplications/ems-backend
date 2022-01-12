const REGEX_PLUS = new RegExp('today\\(\\)\\+\\d+');

const REGEX_MINUS = new RegExp('today\\(\\)\\-\\d+');

/**
 * Gets from input date value the three dates used for filtering.
 * @param value input date value
 * @returns calculated day, beginning of day, and ending of day
 */
export const getDateForFilter = (
  value: any
): { date: Date; startDate: Date; endDate: Date } => {
  // today's date
  let date: Date;
  let startDate: Date;
  let endDate: Date;
  if (value === 'today()') {
    date = new Date();
    startDate = new Date(date);
    endDate = new Date(date);
    // today + number of days
  } else if (REGEX_PLUS.test(value)) {
    const difference = parseInt(value.split('+')[1]);
    date = new Date();
    date.setDate(date.getDate() + difference);
    // today - number of days
  } else if (REGEX_MINUS.test(value)) {
    const difference = -parseInt(value.split('-')[1]);
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
