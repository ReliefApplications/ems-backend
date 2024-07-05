import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';
// import { logger } from '@services/logger.service';
// import mongoose from 'mongoose';
// import { Record } from '@models';

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

/**
 * GraphQL Resource type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
// const ResourceType = new GraphQLObjectType({
//   name: 'Resources',
//   fields: () => ({
//     id: { type: GraphQLID },
//     name: { type: GraphQLString },
//   }),
// });

/**
 * GraphQL DataSet type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DatasetType = new GraphQLObjectType({
  name: 'Dataset',
  fields: () => ({
    name: { type: GraphQLString },
    query: { type: GraphQLJSON },
    // resource: { type: ResourceType },
    filter: { type: GraphQLJSON },
    pageSize: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLJSON) },
    tableStyle: { type: GraphQLJSON },
    blockType: { type: GraphQLJSON },
    textStyle: { type: GraphQLJSON },
    sendAsAttachment: { type: GraphQLBoolean },
    individualEmail: { type: GraphQLBoolean },
    emails: {
      type: GraphQLJSON,
    },
    // records: {
    //   type: GraphQLJSON,
    //   async resolve(parent) {
    //     try {
    //       if (parent.records.length) {
    //         const nestedFields = parent.nestedFields;
    //         const dropdownFields = parent.fields.filter((field) => {
    //           return field.type === 'dropdown' || field.type === 'radiogroup';
    //         });
    //         for (const obj of parent.records) {
    //           const data = obj?.data;

    //           for (const [key, value] of Object.entries(data)) {
    //             if (
    //               mongoose.isValidObjectId(value) &&
    //               typeof value === 'string'
    //             ) {
    //               const project = mergeArrayOfObjects(nestedFields[key]) ?? {};
    //               Object.assign(project, { _id: 0 });
    //               const record = await Record.findById(value, project);
    //               if (record) {
    //                 data[key] = record;
    //               }
    //             }
    //             if (dropdownFields) {
    //               const thisDropdownField = dropdownFields.find((field) => {
    //                 return field.name == key;
    //               });
    //               if (thisDropdownField?.choices) {
    //                 const thisChoice = thisDropdownField.choices.find(
    //                   (choice) => {
    //                     return choice.value === value;
    //                   }
    //                 );
    //                 data[key] = thisChoice?.text ?? value;
    //               }
    //             }
    //           }
    //           Object.assign(obj, data);
    //           delete obj.data;
    //         }
    //       }
    //       return parent.records;
    //     } catch (error) {
    //       logger.error('DataSets Resolver', error.message, {
    //         stack: error.stack,
    //       });
    //     }
    //   },
    // },
    totalCount: {
      type: GraphQLInt,
    },
    tabIndex: {
      type: GraphQLInt,
    },
  }),
});

/**
 * GraphQL EmailLayout type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const EmailLayoutType = new GraphQLObjectType({
  name: 'EmailLayout',
  fields: () => ({
    subject: { type: GraphQLString },
    header: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
    banner: { type: GraphQLJSON },
    footer: { type: GraphQLJSON },
  }),
});

/**
 * GraphQL Recipients type.
 */
export const EmailDistributionListType = new GraphQLObjectType({
  name: 'EmailDistributionList',
  fields: () => ({
    name: { type: GraphQLString },
    To: { type: new GraphQLList(GraphQLString) },
    Cc: { type: new GraphQLList(GraphQLString) },
    Bcc: { type: new GraphQLList(GraphQLString) },
  }),
});

/**
 * GraphQL EmailNotification type.
 */
export const EmailNotificationType = new GraphQLObjectType({
  name: 'EmailNotification',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    applicationId: { type: GraphQLID },
    createdBy: { type: GraphQLJSON },
    schedule: { type: GraphQLString },
    notificationType: { type: GraphQLString },
    datasets: { type: new GraphQLList(DatasetType) },
    emailLayout: { type: EmailLayoutType },
    emailDistributionList: { type: EmailDistributionListType },
    lastExecution: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    status: { type: GraphQLString },
    recipientsType: { type: GraphQLString },
    isDeleted: { type: GraphQLInt },
    isDraft: { type: GraphQLBoolean },
    draftStepper: { type: GraphQLInt },
  }),
});

/** Email Notification connection type */
export const EmailNotificationConnectionType = Connection(
  EmailNotificationType
);
