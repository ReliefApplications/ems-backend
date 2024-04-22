import { ReferenceData } from '@models';

/**
 * Gets the field name with dots for correct nesting
 *
 * @param fieldName the field name to replace
 * @param referenceData reference data to get correct naming from
 * @returns the correct name
 */
export const getReferenceDataName = (
  fieldName: string,
  referenceData: ReferenceData
): string => {
  return (
    referenceData.fields.find((field) => field.graphQLFieldName === fieldName)
      ?.name ?? fieldName
  );
};
