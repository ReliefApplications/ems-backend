/* eslint-disable @typescript-eslint/naming-convention */
/** Enum definition for placeholder text */
export enum Placeholder {
  TODAY = '{{today}}',
  DATASET = '{{dataset}}',
  NOW = '{{now}}',
  LAST_UPDATE = '{{lastUpdate}}',
  RECORD_ID = '{{recordId}}',
}

/** Regex to detect placeholder usage.  */
export const BASE_PLACEHOLDER_REGEX = new RegExp('{{.*?}}');

/** Regex expression that matches 'today + number of days' */
export const REGEX_TODAY_PLUS = new RegExp('{{today ?\\+ ?\\d+}}');

/** Regex expression that matches 'today - number of days' */
export const REGEX_TODAY_MINUS = new RegExp('{{today ?\\- ?\\d+}}');

/**
 * Extract string contained into brackets used for placeholders.
 *
 * @param str input string containing placeholder syntax
 * @returns string contained into brackets.
 */
export const extractStringFromBrackets = (str: string): string => {
  return str.substring(2, str.length - 2);
};
