/* eslint-disable @typescript-eslint/naming-convention */
/** Enum definition for placeholder text */
export enum Placeholder {
  TODAY = '{{today}}',
  DATASET = '{{dataset}}',
  NOW = '{{now}}',
  LAST_UPDATE = '{{lastUpdate}}',
}

/** Regex to detect placeholder usage.  */
export const BASE_PLACEHOLDER_REGEX = new RegExp('{{.*?}}');

/** Regex expression that matches 'today + number of days' */
export const REGEX_TODAY_PLUS = new RegExp('{{today ?\\+ ?\\d+}}');

/** Regex expression that matches 'today - number of days' */
export const REGEX_TODAY_MINUS = new RegExp('{{today ?\\- ?\\d+}}');

/**
 * Tests whether value is using the {{today +-int}} placeholder
 *
 * @param value value to test
 * @returns true if using {{today}}
 */
export const isUsingTodayPlaceholder = (value: any) => {
  return (
    value === Placeholder.TODAY ||
    REGEX_TODAY_MINUS.test(value) ||
    REGEX_TODAY_PLUS.test(value)
  );
};

/**
 * Extract string contained into brackets used for placeholders.
 *
 * @param str input string containing placeholder syntax
 * @returns string contained into brackets.
 */
export const extractStringFromBrackets = (str: string): string => {
  return str.substring(2, str.length - 2);
};
