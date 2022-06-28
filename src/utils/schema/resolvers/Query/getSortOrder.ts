/**
 * Decodes the sort order string
 *
 * @param sortOrder The sort order string
 * @returns The decoded sorted order
 */
export default (sortOrder: string): number => (sortOrder === 'asc' ? 1 : -1);
