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
