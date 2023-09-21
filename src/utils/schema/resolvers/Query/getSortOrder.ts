import { SortOrder } from 'mongoose';

/**
 * Decodes the sort order string
 *
 * @param sortOrder The sort order string
 * @returns The decoded sorted order
 */
export default (sortOrder: string): SortOrder => (sortOrder === 'asc' ? 1 : -1);
