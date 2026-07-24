import mongoose from 'mongoose';
import { getDateForMongo } from '@utils/filter/getDateForMongo';
import { getTimeForMongo } from '@utils/filter/getTimeForMongo';
import {
  MULTISELECT_TYPES,
  DATE_TYPES,
  DATETIME_TYPES,
} from '@const/fieldTypes';
import { escapeRegExp, isNil } from 'lodash';
import { isUsingTodayPlaceholder } from '@const/placeholders';
import { filterOperator } from '../../../../types';
import getTranslatedFieldName from './getTranslatedFieldName';

/** Mongo filter that matches no document, used when an active global search cannot match any field */
// eslint-disable-next-line @typescript-eslint/naming-convention
const MATCH_NOTHING = { _id: { $exists: false } };

/** Mongo filter that matches every document, used when a user-attribute condition is satisfied */
// eslint-disable-next-line @typescript-eslint/naming-convention
const MATCH_EVERYTHING = { _id: { $exists: true } };

/** Prefix of filter fields targeting a user attribute */
// eslint-disable-next-line @typescript-eslint/naming-convention
const ATTRIBUTE_PREFIX = '$attribute.';

/** Operators comparing a user attribute against another record field */
// eslint-disable-next-line @typescript-eslint/naming-convention
const ATTRIBUTE_FIELD_OPERATORS: string[] = [
  filterOperator.EQUAL_TO,
  filterOperator.NOT_EQUAL_TO,
  filterOperator.IN,
  filterOperator.NOT_IN,
];

/** Operators whose value ends up in a $regex expression */
// eslint-disable-next-line @typescript-eslint/naming-convention
const REGEX_OPERATORS: string[] = [
  filterOperator.CONTAINS,
  filterOperator.DOES_NOT_CONTAIN,
  filterOperator.STARTS_WITH,
  filterOperator.ENDS_WITH,
];

/** Field types storing people objects ({ userid, firstname, lastname, emailaddress }) */
// eslint-disable-next-line @typescript-eslint/naming-convention
const PEOPLE_TYPES: string[] = ['people-dropdown', 'people-tagbox'];

/** Person subfields searched by a text contains on a people field */
// eslint-disable-next-line @typescript-eslint/naming-convention
const PEOPLE_SEARCH_FIELDS: string[] = [
  'firstname',
  'lastname',
  'emailaddress',
];

/** The default fields */
const DEFAULT_FIELDS = [
  {
    name: 'id',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'datetime',
  },
  {
    name: 'modifiedAt',
    type: 'datetime',
  },
  {
    name: 'incrementalId',
    type: 'text',
  },
  {
    name: 'form',
    type: 'text',
  },
  {
    name: 'lastUpdateForm',
    type: 'text',
  },
];

/** Names of the default fields */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FLAT_DEFAULT_FIELDS = DEFAULT_FIELDS.map((x) => x.name);

/**
 * Recursively detects whether a built mongo filter contains a comparison
 * against `null` / `undefined` / invalid Date. Such comparisons (typically
 * coming from date fields whose value did not parse, e.g. when a free-text
 * global search is mapped onto a date field) match every document where the
 * field is missing — which would explode the `$or` of the global-search
 * expansion and effectively return every record.
 *
 * @param filter mongo filter fragment to inspect
 * @returns true if the fragment compares to null/invalid Date anywhere
 */
const containsNullComparison = (filter: any): boolean => {
  if (filter === null || filter === undefined) return true;
  if (typeof filter !== 'object') return false;
  if (filter instanceof Date) return isNaN(filter.getTime());
  if (Array.isArray(filter)) return filter.some(containsNullComparison);
  for (const key of Object.keys(filter)) {
    const val = filter[key];
    if (
      ['$gte', '$lte', '$gt', '$lt', '$eq', '$ne'].includes(key) &&
      (val === null ||
        val === undefined ||
        (val instanceof Date && isNaN(val.getTime())))
    ) {
      return true;
    }
    if (containsNullComparison(val)) {
      return true;
    }
  }
  return false;
};

/**
 * Fill passed array with fields used in filters
 *
 * @param filter filter to use for extraction
 * @returns array of used fields
 */
export const extractFilterFields = (filter: any): string[] => {
  let fields = [];
  if (filter.filters) {
    for (const subFilter of filter.filters) {
      fields = fields.concat(extractFilterFields(subFilter));
    }
  } else {
    if (filter.field) {
      if (filter.field === '_globalSearch' && Array.isArray(filter.value)) {
        // Global search: the searched fields are carried by the per-field
        // rules stored in `value`, not by the rule's own field name
        fields.push(
          ...filter.value.map((rule: any) => rule?.field).filter(Boolean)
        );
      } else {
        fields.push(filter.field);
      }
    }
  }
  return fields;
};

/**
 * Checks whether a field is referenced by a composite filter, including
 * inside the per-field rules of a global search rule.
 *
 * @param filter filter to inspect
 * @param fieldName name of the field to look for
 * @returns true if the field is referenced anywhere in the filter
 */
export const isUsedInFilter = (filter: any, fieldName: string): boolean => {
  if (filter?.field) {
    if (filter.field === '_globalSearch' && Array.isArray(filter.value)) {
      return filter.value.some((rule: any) => rule?.field === fieldName);
    }
    return filter.field === fieldName;
  }
  return filter?.filters?.some((f) => isUsedInFilter(f, fieldName)) ?? false;
};

/**
 * Evaluates a user-attribute comparison that does not depend on record data
 * (attribute compared to a literal value instead of another record field),
 * returning a mongo filter that either matches all or no records.
 *
 * @param operator filter operator
 * @param attributeValue current user's attribute value
 * @param compareValue configured literal value
 * @returns Mongo filter matching all or no records
 */
const buildLiteralAttributeFilter = (
  operator: string,
  attributeValue: any,
  compareValue: any
): any => {
  const staticFilter = (matches: boolean) =>
    matches ? MATCH_EVERYTHING : MATCH_NOTHING;
  const attributeText = String(attributeValue ?? '');
  const compareText = String(compareValue ?? '');
  const attributeTextLower = attributeText.toLowerCase();
  const compareTextLower = compareText.toLowerCase();
  const compareValues = (
    Array.isArray(compareValue)
      ? compareValue
      : compareText
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value !== '')
  ).map((value) => String(value ?? ''));

  switch (operator) {
    case filterOperator.EQUAL_TO: {
      return staticFilter(attributeText === compareText);
    }
    case filterOperator.NOT_EQUAL_TO: {
      return staticFilter(attributeText !== compareText);
    }
    case filterOperator.CONTAINS: {
      return staticFilter(attributeTextLower.includes(compareTextLower));
    }
    case filterOperator.DOES_NOT_CONTAIN: {
      return staticFilter(!attributeTextLower.includes(compareTextLower));
    }
    case filterOperator.STARTS_WITH: {
      return staticFilter(attributeTextLower.startsWith(compareTextLower));
    }
    case filterOperator.ENDS_WITH: {
      return staticFilter(attributeTextLower.endsWith(compareTextLower));
    }
    case filterOperator.IN: {
      return staticFilter(compareValues.includes(attributeText));
    }
    case filterOperator.NOT_IN: {
      return staticFilter(!compareValues.includes(attributeText));
    }
    case filterOperator.IS_NULL: {
      return staticFilter(
        attributeValue === null || attributeValue === undefined
      );
    }
    case filterOperator.IS_NOT_NULL: {
      return staticFilter(
        attributeValue !== null && attributeValue !== undefined
      );
    }
    case filterOperator.IS_EMPTY: {
      return staticFilter(attributeText === '');
    }
    case filterOperator.IS_NOT_EMPTY: {
      return staticFilter(attributeText !== '');
    }
    default: {
      return MATCH_NOTHING;
    }
  }
};

/**
 * Builds the membership comparison of a user attribute against a record
 * field (in / notin operators). Record fields — notably multiselect ones —
 * can store values as strings or numbers, so string elements are matched
 * with an anchored case-insensitive regex and, when the attribute is
 * numeric, its number form is matched as well.
 *
 * @param fieldName resolved record field path
 * @param attributeValue current user's attribute value
 * @param negate whether to build the negated (notin) filter
 * @returns Mongo filter matching records whose field contains the attribute
 */
const buildAttributeFieldComparison = (
  fieldName: string,
  attributeValue: any,
  negate = false
): any => {
  const attributeText = String(attributeValue);
  const numericValue = Number(attributeText);
  const isNumeric = attributeText !== '' && !isNaN(numericValue);
  const regex = {
    $regex: `^${escapeRegExp(attributeText)}$`,
    $options: 'i',
  };
  if (negate) {
    const conditions: any[] = [{ [fieldName]: { $not: regex } }];
    if (isNumeric) conditions.push({ [fieldName]: { $ne: numericValue } });
    return conditions.length === 1 ? conditions[0] : { $and: conditions };
  }
  const conditions: any[] = [{ [fieldName]: regex }];
  if (isNumeric) conditions.push({ [fieldName]: numericValue });
  return conditions.length === 1 ? conditions[0] : { $or: conditions };
};

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of structure fields
 * @param context request context
 * @param prefix prefix to access field
 * @returns Mongo filter.
 */
const buildMongoFilter = (
  filter: any,
  fields: any[],
  context: any,
  prefix = ''
): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) => buildMongoFilter(x, fields, context, prefix))
      .filter((x) => x);
    if (filters.length > 0) {
      switch (filter.logic) {
        case 'and': {
          return { $and: filters };
        }
        case 'or': {
          return { $or: filters };
        }
        default: {
          return {};
        }
      }
    } else {
      return {};
    }
  } else {
    if (filter.field) {
      // Locale-based translation: replace the field with its sibling
      // translation field when one matches the user's locale.
      const targetField = getTranslatedFieldName(
        filter.field,
        fields,
        context?.locale
      );

      // Get field name from filter field
      let fieldName = FLAT_DEFAULT_FIELDS.includes(targetField)
        ? targetField
        : `${prefix}${targetField}`;
      // Get type of field from filter field
      let type: string =
        fields.find(
          (x) => x.name === targetField || x.name === targetField.split('.')[0]
        )?.type || '';

      // If type is resource and refers to a nested field, get the type of the nested field
      if (type === 'resource' && context?.resourceFieldsById) {
        const resourceField = fields.find(
          (x) => x.name === filter.field.split('.')[0]
        );

        if (resourceField?.resource) {
          // find the nested field
          const nestedField = context.resourceFieldsById[
            resourceField.resource
          ].find((x) => x.name === filter.field.split('.')[1]);
          // get the type of the nested field
          type = nestedField?.type || type;
        }
      }
      if (filter.field === 'ids') {
        return {
          _id: { $in: filter.value.map((x) => new mongoose.Types.ObjectId(x)) },
        };
      }
      // Filter on forms, using form id
      if (['form', 'lastUpdateForm'].includes(filter.field)) {
        if (mongoose.isValidObjectId(filter.value)) {
          filter.value = new mongoose.Types.ObjectId(filter.value);
          fieldName = `_${filter.field}._id`;
        } else {
          fieldName = `_${filter.field}.name`;
        }
      }
      // Filter on user attribute
      if (['createdBy', 'lastUpdatedBy'].includes(filter.field.split('.')[0])) {
        const [field, subField] = filter.field.split('.');
        fieldName = `_${field}.user.${subField}`;
      }

      const isAttributeFilter = filter.field.startsWith(ATTRIBUTE_PREFIX);
      if (isAttributeFilter && !context?.user) {
        // Attribute filters cannot be resolved without a connected user
        return MATCH_NOTHING;
      }
      // Attribute keys can contain dots (e.g. 'country.iso2code'), so take
      // everything after the prefix instead of splitting on '.'
      const attrValue = isAttributeFilter
        ? context.user.attributes?.[
            filter.field.substring(ATTRIBUTE_PREFIX.length)
          ]
        : '';
      if (isAttributeFilter) {
        // Literal comparisons don't depend on record data: resolve them
        // immediately to a match-all / match-none filter
        if (
          filter.valueSource === 'literal' ||
          !ATTRIBUTE_FIELD_OPERATORS.includes(filter.operator)
        ) {
          return buildLiteralAttributeFilter(
            filter.operator,
            attrValue,
            filter.value
          );
        }
        if (isNil(attrValue)) {
          // A user without the attribute never matches field comparisons —
          // also prevents invalid mongo filters ($regex on undefined, or a
          // null equality that would match records with an empty field)
          return MATCH_NOTHING;
        }
        fieldName = FLAT_DEFAULT_FIELDS.includes(filter.value)
          ? filter.value
          : `${prefix}${filter.value}`;
      }

      if (filter.operator) {
        // People fields: filtering on the special 'me' value matches the
        // connected user inside the stored person object(s). Restricted to
        // 'eq' so text searches for the word "me" keep their meaning.
        if (
          PEOPLE_TYPES.includes(type) &&
          filter.operator === filterOperator.EQUAL_TO &&
          (filter.value === 'me' ||
            (Array.isArray(filter.value) && filter.value.includes('me')))
        ) {
          const meFilters = [];
          if (context?.user?.oid) {
            meFilters.push({ [`${fieldName}.userid`]: context.user.oid });
          }
          if (context?.user?.username) {
            meFilters.push({
              [`${fieldName}.emailaddress`]: {
                $regex: `^${escapeRegExp(context.user.username)}$`,
                $options: 'i',
              },
            });
          }
          if (meFilters.length === 0) {
            return MATCH_NOTHING;
          }
          return { $or: meFilters };
        }
        // Check linked resources
        // Doesn't take into consideration deep objects like users or resources or reference data, but allows resource
        if (
          !isAttributeFilter &&
          filter.field.includes('.') &&
          !fields.find(
            (x) => x.name === filter.field.split('.')[0] && x.referenceData?.id
          )
        ) {
          if (
            !fields.find(
              (x) =>
                x.name === filter.field.split('.')[0] && x.type === 'resource'
            )
          ) {
            // Prevent createdBy / lastUpdatedBy to return, as they should be in the filter
            if (
              !['createdBy', 'lastUpdatedBy'].includes(
                filter.field.split('.')[0]
              )
            ) {
              return;
            }
          } else {
            // Recreate the field name in order to match with aggregation
            // Logic is: _resource_name.data.field, if not default field, else _resource_name.field
            const [resourceName, subFieldName] = filter.field.split('.');
            if (FLAT_DEFAULT_FIELDS.includes(subFieldName)) {
              fieldName = `_${resourceName}.${subFieldName}`;
              type = DEFAULT_FIELDS.find((x) => x.name === subFieldName).type;
            } else {
              // Translation siblings of the subfield are declared on the
              // related resource itself (translateField = bare subfield
              // name), so the locale swap must be resolved against the
              // related resource's own fields
              const resourceField = fields.find(
                (x) => x.name === resourceName && x.type === 'resource'
              );
              const relatedFields =
                context?.resourceFieldsById?.[resourceField?.resource] || [];
              const translatedSubField = getTranslatedFieldName(
                subFieldName,
                relatedFields,
                context?.locale
              );
              fieldName = `_${resourceName}.data.${translatedSubField}`;
            }
          }
        }

        // In case type is multi-select and value is not an array, we treat as scalar
        // As it was probably unwinded in the aggregation
        if (
          MULTISELECT_TYPES.includes(type) &&
          filter.value &&
          !Array.isArray(filter.value)
        ) {
          type = 'text';
        }

        // const fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field) ? filter.field : `data.${filter.field}`;
        // const field = fields.find(x => x.name === filter.field);
        let value = filter.value;
        let intValue: number;
        let endDate: Date;
        let startDatetime: Date;
        let endDatetime: Date;
        switch (type) {
          case 'date':
            // startDate represents the beginning of a day
            ({ startDate: value, endDate } = getDateForMongo(value));
            break;
          case 'datetime':
          case 'datetime-local':
            if (filter.operator !== 'inthelast') {
              //if we are using the {{today}} operator
              if (isUsingTodayPlaceholder(value)) {
                ({ startDate: startDatetime, endDate: endDatetime } =
                  getDateForMongo(value));
              } else {
                // startDatetime contains the beginning of the minute
                startDatetime = getTimeForMongo(value);
                // endDatetime contains the end of the minute (last second, last ms)
                endDatetime = new Date(startDatetime.getTime() + 59999);
                // we end up with a date range covering exactly the minute selected,
                // regardless of the saved seconds and ms
              }
            }
            break;

          case 'time': {
            value = getTimeForMongo(value);
            value = new Date(
              Date.UTC(1970, 0, 1, value.getHours(), value.getMinutes())
            );
            break;
          }
          case 'users': {
            if (context && context.user) {
              // handles the case where we want to filter by connected user
              value = value.map((x) =>
                x === 'me' ? context.user._id.toString() : x
              );
            }
            break;
          }
          case 'boolean': {
            // Avoid the int value to be set
            break;
          }
          default:
            try {
              intValue = Number(value);
              break;
            } catch {
              break;
            }
        }
        switch (filter.operator) {
          case filterOperator.EQUAL_TO: {
            // user attributes
            if (isAttributeFilter) {
              const attrText = String(attrValue);
              const numericAttr = Number(attrText);
              if (attrText === '' || isNaN(numericAttr)) {
                return { [fieldName]: attrValue };
              }
              // Compare both string & number forms, as multiselect fields
              // can store numeric choice values
              return {
                $or: [
                  { [fieldName]: { $eq: attrText } },
                  { [fieldName]: { $eq: numericAttr } },
                ],
              };
            } else if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $size: value.length, $all: value } };
            } else if (DATETIME_TYPES.includes(type)) {
              return {
                [fieldName]: { $gte: startDatetime, $lte: endDatetime },
              };
            } else {
              if (DATE_TYPES.includes(type)) {
                return { [fieldName]: { $gte: value, $lte: endDate } };
              }
              if (isNaN(intValue)) {
                return { [fieldName]: { $eq: value } };
              } else {
                return {
                  $or: [
                    // Make sure that we compare both strings & numbers
                    { [fieldName]: { $eq: String(value) } },
                    { [fieldName]: { $eq: intValue } },
                  ],
                };
              }
            }
          }
          case filterOperator.NOT_EQUAL_TO: {
            // user attributes
            if (isAttributeFilter) {
              const attrText = String(attrValue);
              const numericAttr = Number(attrText);
              if (attrText === '' || isNaN(numericAttr)) {
                return { [fieldName]: { $ne: attrValue } };
              }
              // Compare both string & number forms, as multiselect fields
              // can store numeric choice values
              return {
                $and: [
                  { [fieldName]: { $ne: attrText } },
                  { [fieldName]: { $ne: numericAttr } },
                ],
              };
            } else if (MULTISELECT_TYPES.includes(type)) {
              return {
                [fieldName]: { $not: { $size: value.length, $all: value } },
              };
            } else if (DATETIME_TYPES.includes(type)) {
              return {
                [fieldName]: {
                  $not: { $gte: startDatetime, $lte: endDatetime },
                },
              };
            } else if (DATE_TYPES.includes(type)) {
              return {
                [fieldName]: { $not: { $gte: value, $lte: endDate } },
              };
            } else {
              if (isNaN(intValue)) {
                return { [fieldName]: { $ne: value } };
              } else {
                return {
                  $and: [
                    { [fieldName]: { $ne: String(value) } },
                    { [fieldName]: { $ne: intValue } },
                  ],
                };
              }
            }
          }
          case filterOperator.IS_NULL: {
            return {
              $or: [
                { [fieldName]: { $exists: false } },
                { [fieldName]: { $eq: null } },
              ],
            };
          }
          case filterOperator.IS_NOT_NULL: {
            return { [fieldName]: { $exists: true, $ne: null } };
          }
          case filterOperator.LESS_THAN: {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $lt: value } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $lt: startDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $lt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lt: String(value) } },
                  { [fieldName]: { $lt: intValue } },
                ],
              };
            }
          }
          case filterOperator.LESS_THAN_OR_EQUAL: {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $lte: endDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $lte: endDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $lte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lte: String(value) } },
                  { [fieldName]: { $lte: intValue } },
                ],
              };
            }
          }
          case filterOperator.GREATER_THAN: {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $gt: endDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $gt: endDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $gt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gt: String(value) } },
                  { [fieldName]: { $gt: intValue } },
                ],
              };
            }
          }
          case filterOperator.GREATER_THAN_OR_EQUAL: {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $gte: value } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $gte: startDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $gte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gte: String(value) } },
                  { [fieldName]: { $gte: intValue } },
                ],
              };
            }
          }
          case filterOperator.STARTS_WITH: {
            return { [fieldName]: { $regex: '^' + value, $options: 'i' } };
          }
          case filterOperator.ENDS_WITH: {
            return { [fieldName]: { $regex: value + '$', $options: 'i' } };
          }
          case filterOperator.CONTAINS: {
            if (filter.field === '_globalSearch') {
              // Global search: expand into an $or over each per-field rule
              // produced by the frontend `searchFilters()` helper. Each child
              // rule is delegated back to buildMongoFilter so all the existing
              // path-resolution + per-operator logic is reused (default fields
              // stay flat, others get the `data.` prefix, dotted resource
              // subfields map to the `_<resource>` lookup alias, multiselect
              // uses $all, numeric uses $eq, etc.).
              if (!Array.isArray(value)) {
                return MATCH_NOTHING;
              }
              const subFilters = value
                .map((rule: any) =>
                  buildMongoFilter(
                    {
                      field: rule.field,
                      operator: rule.operator,
                      // Regex operators receive raw user input here; escape it
                      // so searching e.g. "(test" is treated literally instead
                      // of breaking the query. Only done for global search, to
                      // leave explicit column filters untouched.
                      value:
                        typeof rule.value === 'string' &&
                        REGEX_OPERATORS.includes(rule.operator)
                          ? escapeRegExp(rule.value)
                          : rule.value,
                    },
                    fields,
                    context,
                    prefix
                  )
                )
                .filter((x: any) => x && !containsNullComparison(x));
              if (subFilters.length === 0) {
                // An active search that cannot match any field must return no
                // records — dropping the filter would return all of them
                return MATCH_NOTHING;
              }
              return { $or: subFilters };
            } else if (PEOPLE_TYPES.includes(type)) {
              // People fields store the person object(s) — search the name /
              // email subfields the widgets display. Multi-word searches
              // (e.g. "John Doe") require every word to match one of the
              // subfields.
              const tokens = String(value).trim().split(/\s+/).filter(Boolean);
              if (tokens.length === 0) {
                return;
              }
              return {
                $and: tokens.map((token) => ({
                  $or: PEOPLE_SEARCH_FIELDS.map((sub) => ({
                    [`${fieldName}.${sub}`]: { $regex: token, $options: 'i' },
                  })),
                })),
              };
            } else if (type === 'file') {
              // File fields store an array of file objects; match the file
              // names, which is what the widgets display
              return {
                [`${fieldName}.name`]: { $regex: value, $options: 'i' },
              };
            } else if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $all: value } };
            } else {
              return { [fieldName]: { $regex: value, $options: 'i' } };
            }
          }
          case filterOperator.DOES_NOT_CONTAIN: {
            if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $not: { $in: value } } };
            } else {
              return {
                [fieldName]: { $not: { $regex: value, $options: 'i' } },
              };
            }
          }
          case filterOperator.IN: {
            if (isAttributeFilter) {
              return buildAttributeFieldComparison(fieldName, attrValue);
            } else {
              // Allow values to be passed as string separated with ','
              if (typeof value === 'string') {
                value = value.split(',').map((x) => x.trim());
              }
              value = Array.isArray(value) ? value : [value];
              // Use _id field for objectId filtering
              if (fieldName === 'id') {
                fieldName = '_id';
              }
              // Try to cast values as object ids if possible
              try {
                return {
                  $or: [
                    {
                      [fieldName]: {
                        $in: value.map((x) => new mongoose.Types.ObjectId(x)),
                      },
                    },
                    {
                      [fieldName]: {
                        $in: value,
                      },
                    },
                  ],
                };
              } catch {
                return {
                  [fieldName]: {
                    $in: value,
                  },
                };
              }
            }
          }
          case filterOperator.NOT_IN: {
            if (isAttributeFilter) {
              return buildAttributeFieldComparison(fieldName, attrValue, true);
            } else {
              // Allow values to be passed as string separated with ','
              if (typeof value === 'string') {
                value = value.split(',').map((x) => x.trim());
              }
              value = Array.isArray(value) ? value : [value];
              // Use _id field for objectId filtering
              if (fieldName === 'id') {
                fieldName = '_id';
              }
              // Try to cast values as object ids if possible
              try {
                return {
                  $and: [
                    {
                      [fieldName]: {
                        $nin: value.map((x) => new mongoose.Types.ObjectId(x)),
                      },
                    },
                    {
                      [fieldName]: {
                        $nin: value,
                      },
                    },
                  ],
                };
              } catch {
                return {
                  [fieldName]: {
                    $nin: value,
                  },
                };
              }
            }
          }
          case filterOperator.IS_EMPTY: {
            if (MULTISELECT_TYPES.includes(type)) {
              return {
                $or: [
                  { [fieldName]: { $exists: true, $size: 0 } },
                  { [fieldName]: { $exists: false } },
                  { [fieldName]: { $eq: null } },
                ],
              };
            } else {
              return { [fieldName]: { $exists: true, $eq: '' } };
            }
          }
          case filterOperator.IS_NOT_EMPTY: {
            if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $exists: true, $nin: [null, []] } };
            } else {
              return { [fieldName]: { $exists: true, $nin: [null, ''] } };
            }
          }
          case 'inthelast': {
            if ([...DATE_TYPES, ...DATETIME_TYPES].includes(type)) {
              const now = Date.now();
              const withinTheLastMs = value * 60 * 1000;
              const dateLowerLimit = new Date(now - withinTheLastMs);
              return { [fieldName]: { $gte: dateLowerLimit } };
            } else {
              return;
            }
          }
          case 'near': {
            return {
              [fieldName]: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: value.geometry,
                  },
                  $maxDistance: value.distance,
                },
              },
            };
          }
          case 'notnear': {
            return {
              [fieldName]: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: value.geometry,
                  },
                  $minDistance: value.distance,
                },
              },
            };
          }
          case 'intersects': {
            return {
              [fieldName]: {
                $geoIntersects: {
                  $geometry: {
                    type: 'Polygon',
                    coordinates: value.geometry,
                  },
                },
              },
            };
          }
          case 'notintersects': {
            return {
              [fieldName]: {
                $not: {
                  $geoIntersects: {
                    $geometry: {
                      type: 'Polygon',
                      coordinates: value.geometry,
                    },
                  },
                },
              },
            };
          }
          default: {
            return;
          }
        }
      } else {
        return;
      }
    }
  }
};

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of structure fields
 * @param context request context
 * @param prefix prefix to access field
 * @returns Mongo filter.
 */
export default (
  filter: any,
  fields: any[],
  context?: any,
  prefix = 'data.'
) => {
  const expandedFields = fields.concat(DEFAULT_FIELDS);
  const mongooseFilter =
    buildMongoFilter(filter, expandedFields, context, prefix) || {};

  return mongooseFilter;
};
