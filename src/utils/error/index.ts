/**
 * Helpers for safely reading properties off values caught in `catch` blocks.
 *
 * TypeScript types caught values as `unknown` (and a thrown value can be
 * anything, not just an `Error`), so these helpers narrow the value before
 * accessing common error properties.
 */

/**
 * Extract a human-readable message from an unknown thrown value.
 *
 * @param error value caught in a `catch` block
 * @returns the error message, or the value stringified if it is not an Error
 */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Extract the stack trace from an unknown thrown value, if any.
 *
 * @param error value caught in a `catch` block
 * @returns the stack trace, or undefined if the value is not an Error
 */
export const getErrorStack = (error: unknown): string | undefined =>
  error instanceof Error ? error.stack : undefined;

/**
 * Extract a `code` property (e.g. MongoDB duplicate-key code 11000) from an
 * unknown thrown value, if present.
 *
 * @param error value caught in a `catch` block
 * @returns the error code, or undefined if absent
 */
export const getErrorCode = (error: unknown): string | number | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: string | number }).code
    : undefined;
