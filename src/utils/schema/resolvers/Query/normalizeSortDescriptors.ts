/** A single sort descriptor: logical field name + direction. */
export interface SortDescriptor {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Normalizes the legacy sortField/sortOrder scalars and the new sortFields
 * array into a single ordered list of sort descriptors. sortFields wins when
 * present and non-empty; otherwise falls back to sortField/sortOrder, so
 * callers that only know about the legacy scalars keep working unchanged.
 *
 * @param sortField Legacy single sort field name
 * @param sortOrder Legacy single sort order
 * @param sortFields Ordered list of { field, order } sort descriptors
 * @returns Normalized, ordered list of sort descriptors
 */
export default (
  sortField?: string,
  sortOrder?: string,
  sortFields?: { field: string; order?: string }[]
): SortDescriptor[] => {
  if (Array.isArray(sortFields) && sortFields.length > 0) {
    return sortFields
      .filter((s) => s && s.field)
      .map((s) => ({
        field: s.field,
        order: s.order === 'desc' ? 'desc' : ('asc' as const),
      }));
  }
  if (sortField) {
    return [{ field: sortField, order: sortOrder === 'desc' ? 'desc' : 'asc' }];
  }
  return [];
};
