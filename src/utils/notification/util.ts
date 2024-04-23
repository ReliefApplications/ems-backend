/**
 * To replace all special characters with whitespace
 *
 * @param userValue The user's input value
 * @returns A string where all non-alphanumeric and non-hyphen characters are replaced with a whitespace.
 */
export const replaceUnderscores = (userValue: string): string => {
  return userValue ? userValue.replace(/[^a-zA-Z0-9-]/g, ' ') : '';
};

/**
 * Converts String to Title Case
 *
 * @param str Input string to be converted
 * @returns Titlecase string
 */
export const titleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Replaces dates of type Date with pretty string representation
 *
 * @param rowData data going into table, from DB
 * @returns mutated date
 */
export const formatDates = (rowData: unknown): string => {
  if (typeof rowData === 'string') {
    // Create the string in date format
    const date = new Date(rowData);
    if (!isNaN(date.getTime())) {
      // Format the date as MM/DD/YY, hh:mm AM/PM UTC
      return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
        timeZoneName: 'short',
      });
    }
  } else if (rowData instanceof Date) {
    // Format the date as MM/DD/YY, hh:mm AM/PM UTC
    return rowData.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  }
  if (!rowData) {
    return '';
  }
  return rowData as string;
};

/**
 * Replaces datetime macros in email template with datetimes
 *
 * @param textElement Email template section with date macros to replace
 * @returns Mutated text element with datetime macros replaced
 */
export const replaceDateMacro = (textElement: string): string => {
  if (textElement) {
    if (textElement.includes('{{now.time}}')) {
      const nowToString = new Date().toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        timeZoneName: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
      textElement = textElement.replace('{{now.time}}', nowToString);
    }
    if (textElement.includes('{{now.datetime}}')) {
      const nowToString = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        timeZoneName: 'short',
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
      });
      textElement = textElement.replace('{{now.datetime}}', nowToString);
    }
    if (textElement.includes('{{today.date}}')) {
      const todayToString = new Date().toLocaleDateString('en-US', {
        timeZone: 'UTC',
        timeZoneName: 'short',
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      });
      textElement = textElement.replace('{{today.date}}', todayToString);
    }
  }

  return textElement;
};
