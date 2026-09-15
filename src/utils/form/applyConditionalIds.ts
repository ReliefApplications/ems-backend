import { getNextConditionalId } from './getNextConditionalId';

/** Digit count used when a field's trueDigits/falseDigits property is absent (matches the frontend's declared default; SurveyJS omits properties equal to their default from the saved form JSON). */
const DEFAULT_DIGITS = 4;

/** Field definition for a conditionalId-typed field (flat properties, as configured via the SurveyJS property panel). */
export type ConditionalIdField = {
  name: string;
  type: string;
  sourceField: string;
  truePrefix: string;
  trueDigits?: number;
  falsePrefix: string;
  falseDigits?: number;
};

/**
 * Computes and assigns the value of every conditionalId-typed field on the given
 * form/resource fields, based on the current value of each field's sourceField.
 * Any client-supplied value for these fields is discarded first: they are always
 * system-generated, never user-editable.
 *
 * @param fields form or resource field definitions.
 * @param data record data to mutate in place (record.data at creation time).
 * @param structureId id of the form / resource, used to scope the id counters.
 */
export const applyConditionalIds = async (
  fields: any[],
  data: any,
  structureId: string
): Promise<void> => {
  const conditionalIdFields: ConditionalIdField[] = (fields || []).filter(
    (field) => field.type === 'conditionalid'
  );
  for (const field of conditionalIdFields) {
    delete data[field.name];
    const prefix = data[field.sourceField]
      ? field.truePrefix
      : field.falsePrefix;
    const digits = data[field.sourceField]
      ? field.trueDigits ?? DEFAULT_DIGITS
      : field.falseDigits ?? DEFAULT_DIGITS;
    data[field.name] = await getNextConditionalId(
      structureId,
      field.name,
      prefix,
      digits
    );
  }
};
