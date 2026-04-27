import { JSONPath } from 'jsonpath-plus';

type JSONValue =
  | null
  | boolean
  | number
  | string
  | Record<string, unknown>
  | unknown[];

/**
 * Finds all values matching a JSONPath expression.
 *
 * @param json JSON payload to search.
 * @param path JSONPath expression.
 * @returns matching values.
 */
const query = <T = unknown>(json: unknown, path: string): T[] =>
  JSONPath<T[]>({
    path,
    json: json as JSONValue,
    wrap: true,
  });

/**
 * Finds a single value matching a JSONPath expression.
 *
 * @param json JSON payload to search.
 * @param path JSONPath expression.
 * @returns first matching value, if any.
 */
const value = <T = unknown>(json: unknown, path: string): T | undefined =>
  JSONPath<T | undefined>({
    path,
    json: json as JSONValue,
    wrap: false,
  });

/** JSONPath helper methods. */
const jsonpath = { query, value };

export default jsonpath;
