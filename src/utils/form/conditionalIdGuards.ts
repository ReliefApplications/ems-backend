import { ConditionalIdField } from './applyConditionalIds';

/**
 * Removes any client-supplied value for conditionalId-typed fields from the
 * given data, in place. These fields are always system-generated, at record
 * creation time only, and must never be settable through an edit.
 *
 * @param fields form or resource field definitions.
 * @param data incoming edit data to mutate in place (args.data).
 */
export const stripConditionalIdFields = (fields: any[], data: any): void => {
  const conditionalIdFields: ConditionalIdField[] = (fields || []).filter(
    (field) => field.type === 'conditionalid'
  );
  for (const field of conditionalIdFields) {
    delete data[field.name];
  }
};

/**
 * Looks for a conditionalId field whose sourceField is present in the incoming
 * edit data and differs from its current value on the record. Editing that
 * boolean must go through the clone-on-change flow instead of a normal edit.
 *
 * @param fields form or resource field definitions.
 * @param oldData current record data.
 * @param newData incoming edit data (args.data).
 * @returns the first conditionalId field whose sourceField changed, or undefined.
 */
export const getChangedConditionalIdSourceField = (
  fields: any[],
  oldData: any,
  newData: any
): ConditionalIdField | undefined => {
  const conditionalIdFields: ConditionalIdField[] = (fields || []).filter(
    (field) => field.type === 'conditionalid'
  );
  return conditionalIdFields.find(
    (field) =>
      Object.prototype.hasOwnProperty.call(newData, field.sourceField) &&
      Boolean(newData[field.sourceField]) !==
        Boolean(oldData[field.sourceField])
  );
};
