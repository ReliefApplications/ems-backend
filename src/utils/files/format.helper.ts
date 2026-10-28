/**
 * Remove special characters of name that are not allowed
 *
 * @param name name to process
 * @returns name without restricted character
 */
export const formatFilename = (name: string): string => {
  const regex = /[:*?\\/[\]]/g;
  return name.replace(regex, '');
};

/** Characters that make a spreadsheet application evaluate a cell as a formula */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralise a value before it is written in a CSV or spreadsheet cell.
 *
 * A text starting with =, +, -, @, tab or carriage return is evaluated as a formula
 * by Excel and other spreadsheet applications (CSV / formula injection): a record
 * value such as `=HYPERLINK(...)` or `=cmd|...` would run on the machine of whoever
 * opens the export. Such texts are prefixed with a single quote, which spreadsheet
 * applications display as plain text. Numbers, dates and other types, as well as
 * texts that are plain numbers (such as "-12.5"), are left untouched.
 *
 * @param value cell value
 * @returns value safe to write in a cell
 */
export const sanitizeCellValue = <T>(value: T): T | string => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }
  if (!FORMULA_TRIGGERS.includes(value[0])) {
    return value;
  }
  // Numeric texts ("-5", "+3.2") are harmless and expected to stay readable as numbers
  if (
    /^[+-]/.test(value) &&
    value.trim() === value &&
    Number.isFinite(Number(value))
  ) {
    return value;
  }
  return `'${value}`;
};
