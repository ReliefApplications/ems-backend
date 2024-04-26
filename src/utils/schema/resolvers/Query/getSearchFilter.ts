import mongoose from 'mongoose';

/** The default fields */
const DEFAULT_FIELDS = [
  {
    name: 'id',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'modifiedAt',
    type: 'date',
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

/**
 * Wild card search interface.
 */
interface WildcardSearch {
  wildcard: {
    query: string;
    path:
      | {
          wildcard: string;
        }
      | string;
    allowAnalyzedField: true;
  };
}

/**
 * Search stage interface.
 */
interface SearchStage {
  $search: {
    index: string;
    compound: {
      must: WildcardSearch[];
    };
  };
}

/** Names of the default fields */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FLAT_DEFAULT_FIELDS = DEFAULT_FIELDS.map((x) => x.name);

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
      fields.push(filter.field);
    }
  }
  return fields;
};

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of structure fields
 * @param context request context
 * @param prefix prefix to access field
 * @param searchStage Search stage being built
 * @returns Mongo filter.
 */
const buildMongoFilter = (
  filter: any,
  fields: any[],
  context: any,
  prefix = '',
  searchStage
): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) =>
        buildMongoFilter(x, fields, context, prefix, searchStage)
      )
      .filter((x) => x);
    if (filters.length > 0) {
      switch (filter.logic) {
        case 'and': {
          return filters;
        }
        case 'or': {
          return filters;
        }
        default: {
          return;
        }
      }
    } else {
      return;
    }
  } else {
    if (filter.field) {
      // Get field name from filter field
      let fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field)
        ? filter.field
        : `${prefix}${filter.field}`;
      // Get type of field from filter field
      let type: string =
        fields.find(
          (x) =>
            x.name === filter.field || x.name === filter.field.split('.')[0]
        )?.type || '';

      // If type is resource and refers to a nested field, get the type of the nested field
      if (type === 'resource' && context.resourceFieldsById) {
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

      const isAttributeFilter = filter.field.startsWith('$attribute.');
      if (isAttributeFilter)
        fieldName = FLAT_DEFAULT_FIELDS.includes(filter.value)
          ? filter.value
          : `${prefix}${filter.value}`;

      if (filter.operator) {
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
            if (FLAT_DEFAULT_FIELDS.includes(filter.field.split('.')[1])) {
              fieldName = `_${filter.field.split('.')[0]}.${
                filter.field.split('.')[1]
              }`;
              type = DEFAULT_FIELDS.find(
                (x) => x.name === filter.field.split('.')[1]
              ).type;
            } else {
              fieldName = `_${filter.field.split('.')[0]}.data.${
                filter.field.split('.')[1]
              }`;
            }
          }
        }

        // const fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field) ? filter.field : `data.${filter.field}`;
        // const field = fields.find(x => x.name === filter.field);
        const value = filter.value;
        switch (filter.operator) {
          case 'contains': {
            if (fieldName.includes('id')) {
              return;
            }
            if (type === 'text' || type === '') {
              if (fieldName == 'data._globalSearch') {
                const number = Number(value[0].value);
                if (number) {
                  return;
                } else {
                  searchStage.$search.compound.must.unshift({
                    wildcard: {
                      query: `*${value[0].value}*`,
                      path: value.map((searchObject) => {
                        const pathName = FLAT_DEFAULT_FIELDS.includes(
                          searchObject.field
                        )
                          ? searchObject.field
                          : `${prefix}${searchObject.field}`;
                        return pathName;
                      }),
                      allowAnalyzedField: true,
                    },
                  });
                  return;
                }
              } else {
                searchStage.$search.compound.must.unshift({
                  wildcard: {
                    query: `*${value}*`,
                    path: fieldName,
                    allowAnalyzedField: true,
                  },
                });
                return;
              }
            }
          }
          case 'startswith': {
            if (fieldName.includes('id')) {
              return;
            }
            searchStage.$search.compound.must.unshift({
              wildcard: {
                query: `${value}*`,
                path: fieldName,
                allowAnalyzedField: true,
              },
            });
            return;
          }
          case 'endswith': {
            if (fieldName.includes('id')) {
              return;
            }
            searchStage.$search.compound.must.unshift({
              wildcard: {
                query: `*${value}`,
                path: fieldName,
                allowAnalyzedField: true,
              },
            });
            return;
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
  // Default search stage
  const searchStage: SearchStage = {
    $search: {
      index: 'keyword_lowercase',
      compound: {
        must: [],
      },
    },
  };
  const expandedFields = fields.concat(DEFAULT_FIELDS);
  buildMongoFilter(filter, expandedFields, context, prefix, searchStage);

  // If some rules are defined, return search stage, to be added to main pipeline
  if (searchStage.$search.compound.must.length > 0) {
    return searchStage;
  }
  return;
};
