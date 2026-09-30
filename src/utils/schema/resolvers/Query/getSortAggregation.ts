import { SortOrder } from 'mongoose';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { getFullChoices } from '../../../form';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getTranslatedFieldName from './getTranslatedFieldName';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';
import { SortDescriptor } from './normalizeSortDescriptors';

/**
 * Resolves the translation sibling of a sort field for the user's locale.
 *
 * Top-level fields carry their siblings in the structure fields; subfields of
 * a related resource (`<resource>.<subfield>`) carry them on the related
 * resource's own fields, exposed through `context.resourceFieldsById`.
 *
 * @param sortField Sort by field
 * @param fields Structure fields
 * @param context Request context
 * @returns Translated field name, plus the document paths of the translation and of its source when a sibling exists
 */
const resolveTranslation = (
  sortField: string,
  fields: any[],
  context: any
): { name: string; translatedPath?: string; sourcePath?: string } => {
  const locale = context?.locale;
  if (sortField && sortField.includes('.')) {
    const [resourceName, subField] = sortField.split('.');
    const resourceField = fields.find(
      (x) => x && x.name === resourceName && x.type === 'resource'
    );
    const relatedFields =
      context?.resourceFieldsById?.[resourceField?.resource] || [];
    const translatedSubField = getTranslatedFieldName(
      subField,
      relatedFields,
      locale
    );
    if (translatedSubField === subField) {
      return { name: sortField };
    }
    return {
      name: `${resourceName}.${translatedSubField}`,
      translatedPath: `_${resourceName}.data.${translatedSubField}`,
      sourcePath: `_${resourceName}.data.${subField}`,
    };
  }
  const translated = getTranslatedFieldName(sortField, fields, locale);
  if (translated === sortField) {
    return { name: sortField };
  }
  return {
    name: translated,
    translatedPath: `data.${translated}`,
    sourcePath: `data.${sortField}`,
  };
};

/**
 * Builds the aggregation stages (choice-resolution + sort) for a single sort
 * descriptor, and adds its resolved path/order to the shared sort stage.
 *
 * @param sortField Sort by field
 * @param sortOrder Sort order
 * @param fields Structure fields
 * @param context Request context
 * @param sortStage Shared compound $sort object, mutated in place
 * @returns Aggregation stages needed before the $sort stage (e.g. $addFields for choice resolution)
 */
const buildSortDescriptorAggregation = async (
  sortField: string,
  sortOrder: string,
  fields: any[],
  context: any,
  sortStage: Record<string, SortOrder>
): Promise<any[]> => {
  // Locale-based translation: replace the sort field with its sibling
  // translation field when one matches the user's locale.
  const translation = resolveTranslation(sortField, fields, context);
  sortField = translation.name;

  const field: any = fields.find((x) => x && x.name === sortField);
  const hasChoices =
    field && (field.choices || field.choicesByUrl || field.choicesByGraphQL);

  // Translated text fields: sort on the displayed value, i.e. the translation
  // sibling when set, otherwise the source field (same fallback as the entity
  // resolvers and as getFilter)
  if (translation.translatedPath && !hasChoices) {
    const alias = `_${sortField.replace('.', '_')}`;
    const translatedValue = `$${translation.translatedPath}`;
    sortStage[alias] = getSortOrder(sortOrder);
    return [
      {
        $addFields: {
          [alias]: {
            $cond: [
              {
                $or: [
                  { $in: [{ $type: translatedValue }, ['missing', 'null']] },
                  { $eq: [translatedValue, ''] },
                ],
              },
              `$${translation.sourcePath}`,
              translatedValue,
            ],
          },
        },
      },
    ];
  }
  const parentField: any =
    sortField && sortField.includes('.')
      ? fields.find((x) => x && x.name === sortField.split('.')[0])
      : '';
  const aggregation = [];
  // If we need to populate choices to sort on the text value
  if (hasChoices) {
    const rawChoices = (await getFullChoices(field, context)) || [];
    // Resolve each choice's (possibly localized) text to the active locale so
    // that we sort on the displayed value rather than the raw locale object.
    const choices = rawChoices.map((choice: any) =>
      choice && typeof choice === 'object'
        ? {
            ...choice,
            text: resolveLocalizedString(choice.text, context?.locale),
          }
        : choice
    );
    const choicesValue = choices.map((x) => x.value);
    const choicesText = choices.map((x) => x?.text);
    // Create aggregation to have text instead of values
    if (MULTISELECT_TYPES.includes(field.type)) {
      aggregation.push({
        $addFields: {
          [`_${sortField}`]: {
            $let: {
              // accessible variables in the $in expression
              vars: {
                choices,
              },
              // expression to evaluate
              in: {
                $cond: {
                  // Check that field is array
                  if: {
                    $isArray: `$data.${sortField}`,
                  },
                  // Only apply on array fields
                  then: {
                    // apply to each item of expression
                    $map: {
                      // expression that resolves to an array
                      input: {
                        // filter array
                        $filter: {
                          // array to filter
                          input: '$$choices',
                          // filtering condition
                          cond: {
                            $in: ['$$this.value', `$data.${sortField}`],
                          },
                        },
                      },
                      // each item returns as text
                      in: '$$this.text',
                    },
                  },
                  // Skip
                  else: [],
                },
              },
            },
          },
        },
      });
    } else {
      aggregation.push({
        $addFields: {
          [`_${sortField}`]: {
            $let: {
              vars: {
                choicesText,
                choicesValue,
              },
              // Resolve the choice value to its localized display text so the
              // sort is performed on the translated label.
              in: {
                $arrayElemAt: [
                  '$$choicesText',
                  {
                    $indexOfArray: ['$$choicesValue', `$data.${sortField}`],
                  },
                ],
              },
            },
          },
        },
      });
    }
  }
  // Add this field's resolved path/order to the shared compound sort stage
  sortStage[getSortField(sortField, parentField ? parentField : field)] =
    getSortOrder(sortOrder);
  return aggregation;
};

/**
 * Builds sort aggregation for one or several sort descriptors, applied in
 * priority order (equivalent to a SQL `ORDER BY field1, field2, ...`).
 *
 * @param sortDescriptors Ordered list of sort descriptors to apply
 * @param fields Structure fields
 * @param context Request context
 * @returns Sort aggregation
 */
const getSortAggregation = async (
  sortDescriptors: SortDescriptor[],
  fields: any[],
  context: any
): Promise<any[]> => {
  if (!sortDescriptors || sortDescriptors.length === 0) {
    return [];
  }

  const aggregation: any[] = [];
  // Plain object: key insertion order gives us the sort priority order for
  // MongoDB's compound $sort stage.
  const sortStage: Record<string, SortOrder> = {};

  for (const descriptor of sortDescriptors) {
    const stages = await buildSortDescriptorAggregation(
      descriptor.field,
      descriptor.order,
      fields,
      context,
      sortStage
    );
    aggregation.push(...stages);
  }

  aggregation.push({ $sort: sortStage });
  return aggregation;
};

export default getSortAggregation;
