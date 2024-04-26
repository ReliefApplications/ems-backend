import { Record } from '@models';
import { GraphQLInt, GraphQLObjectType } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import { logger } from '@services/logger.service';

/**
 * GraphQL DataSet type definition
 *
 * @param arrayOfObjects object array
 * @returns project
 */
export const mergeArrayOfObjects = (
  arrayOfObjects: { [key: string]: number }[]
): any => {
  if (!arrayOfObjects) {
    return {};
  }
  return arrayOfObjects.reduce((result, obj) => {
    const key = Object.keys(obj)[0];
    result[key] = obj[key];
    return result;
  }, {});
};

/** GraphQL DataSet type definition */
export const DatasetType = new GraphQLObjectType({
  name: 'Dataset',
  fields: () => ({
    emails: {
      type: GraphQLJSON,
    },
    records: {
      type: GraphQLJSON,
      async resolve(parent) {
        try {
          if (parent.records.length) {
            const nestedFields = parent.nestedFields;
            for (const obj of parent.records) {
              const data = obj?.data;

              for (const [key, value] of Object.entries(data)) {
                if (
                  mongoose.isValidObjectId(value) &&
                  typeof value === 'string'
                ) {
                  const project = mergeArrayOfObjects(nestedFields[key]) ?? {};
                  Object.assign(project, { _id: 0 });
                  const record = await Record.findById(value, project);
                  data[key] = record;
                }
              }
              Object.assign(obj, data);
              delete obj.data;
            }
          }
          // console.log('type resolver');
          // console.log(parent.records);
          return parent.records;
        } catch (error) {
          logger.error('Failed to resolved dataset', error.message, {
            stack: error.stack,
          });
        }
      },
    },
    totalCount: {
      type: GraphQLInt,
    },
    tabIndex: {
      type: GraphQLInt,
    },
  }),
});
