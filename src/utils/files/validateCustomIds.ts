import { Record } from '@models';
import { Types } from 'mongoose';

/** Valid MongoDB ObjectId string: exactly 24 hexadecimal characters. */
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** A single row of the uploaded file's `_id` column, prior to normalization. */
interface CustomIdRow {
  /** Spreadsheet row number, for error reporting. */
  rowNumber: number;
  /** Raw exceljs cell value for that row's `_id` column. */
  rawValue: any;
}

/** Reason a custom `_id` upload was rejected. */
type CustomIdErrorKey =
  | 'invalidCustomId'
  | 'duplicateCustomId'
  | 'existingCustomId';

/**
 * Result of validating a file's custom `_id` column. `ids` is only
 * populated when `error` is null (this repo does not enable
 * `strictNullChecks`, so the two fields cannot be modeled as a
 * discriminated union that TS would narrow automatically).
 */
interface CustomIdValidationResult {
  error: {
    key: CustomIdErrorKey;
    params: { row: number; value: string };
  } | null;
  ids: string[];
}

/**
 * Normalize a raw exceljs cell value to a trimmed string representation,
 * regardless of whether the cell holds plain text, a number, a formula
 * result, or rich text.
 *
 * @param value raw cell value from exceljs row.values
 * @returns trimmed string representation of the cell
 */
const normalizeCustomId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('result' in value) return normalizeCustomId(value.result);
    if ('text' in value) return normalizeCustomId(value.text);
    if (Array.isArray(value.richText)) {
      return value.richText.map((t: any) => t.text).join('');
    }
    return String(value);
  }
  return String(value).trim();
};

/**
 * Validate the `_id` column of an uploaded file against the custom-id
 * upload rules: every cell must be non-empty and a valid 24-character
 * hexadecimal ObjectId, values must not repeat within the file, and none
 * may already exist in the records collection (globally, including
 * archived records).
 *
 * @param rows rows with their spreadsheet row number and raw `_id` cell value
 * @returns null-error result with normalized ids if every row is valid,
 * otherwise the first validation error found, in file order
 */
export const validateCustomIds = async (
  rows: CustomIdRow[]
): Promise<CustomIdValidationResult> => {
  if (rows.length === 0) {
    return { error: null, ids: [] };
  }

  const seen = new Map<string, number>();
  const candidates: { rowNumber: number; id: string }[] = [];

  for (const { rowNumber, rawValue } of rows) {
    const value = normalizeCustomId(rawValue);
    if (!OBJECT_ID_REGEX.test(value)) {
      return {
        error: { key: 'invalidCustomId', params: { row: rowNumber, value } },
        ids: [],
      };
    }
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      return {
        error: {
          key: 'duplicateCustomId',
          params: { row: rowNumber, value },
        },
        ids: [],
      };
    }
    seen.set(normalized, rowNumber);
    candidates.push({ rowNumber, id: value });
  }

  const existing = await Record.find({
    _id: { $in: candidates.map((c) => new Types.ObjectId(c.id)) },
  })
    .select('_id')
    .lean();

  if (existing.length > 0) {
    const existingIds = new Set(
      existing.map((r) => String(r._id).toLowerCase())
    );
    const firstExisting = candidates.find((c) =>
      existingIds.has(c.id.toLowerCase())
    );
    return {
      error: {
        key: 'existingCustomId',
        params: { row: firstExisting.rowNumber, value: firstExisting.id },
      },
      ids: [],
    };
  }

  return { error: null, ids: candidates.map((c) => c.id) };
};
