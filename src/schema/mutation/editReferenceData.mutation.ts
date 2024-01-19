import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLInputObjectType,
} from 'graphql';
import { Form, ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import {
  ReferenceDataTypeEnumType,
  ReferenceDataArgsType,
} from '@const/enumTypes';
import {
  validateGraphQLFieldName,
  validateGraphQLTypeName,
} from '@utils/validators';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editReferenceData mutation */
type EditReferenceDataArgs = {
  id: string;
  name?: string;
  type?: ReferenceDataArgsType;
  apiConfiguration: string | Types.ObjectId;
  query: string;
  fields?: any;
  valueField?: string;
  path?: string;
  data?: any;
  graphQLFilter?: string;
  permissions?: any;
  graphQLTypeName?: string;
};

/**
 * Edit the passed referenceData if authorized.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    type: { type: ReferenceDataTypeEnumType },
    apiConfiguration: { type: GraphQLID },
    query: { type: GraphQLString },
    fields: { type: GraphQLJSON },
    valueField: { type: GraphQLString },
    path: { type: GraphQLString },
    data: { type: GraphQLJSON },
    graphQLFilter: { type: GraphQLString },
    permissions: { type: GraphQLJSON },
    pageInfo: {
      type: new GraphQLInputObjectType({
        name: 'PageInfoInput',
        fields: {
          totalCountField: { type: GraphQLString },
          strategy: { type: new GraphQLNonNull(GraphQLString) },
          pageSizeVar: { type: GraphQLString },
          cursorVar: { type: GraphQLString },
          cursorField: { type: GraphQLString },
          pageVar: { type: GraphQLString },
          offsetVar: { type: GraphQLString },
        },
      }),
    },
  },
  async resolve(parent, args: EditReferenceDataArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      // Build update
      const update = {
        ...args,
      };
      delete update.id;
      // Check update
      if (update.name) {
        // Check name
        const graphQLTypeName = ReferenceData.getGraphQLTypeName(args.name);
        validateGraphQLTypeName(graphQLTypeName);
        if (
          (await Form.hasDuplicate(graphQLTypeName)) ||
          (await ReferenceData.hasDuplicate(graphQLTypeName, args.id))
        ) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.reference.edit.errors.formResDuplicated'
            )
          );
        }
        update.graphQLTypeName = ReferenceData.getGraphQLTypeName(args.name);
      }
      if (update.fields) {
        // Generate graphql field names
        for (const field of update.fields) {
          field.graphQLFieldName = ReferenceData.getGraphQLFieldName(
            field.name
          );
        }
        // Check fields
        for (const field of update.fields) {
          validateGraphQLFieldName(field.graphQLFieldName, context.i18next);
        }
      }
      // We need at least one field in order to update the api reference data
      if (Object.keys(update).length < 1) {
        throw new GraphQLError(
          context.i18next.t('mutations.reference.edit.errors.invalidArguments')
        );
      }
      const filters = ReferenceData.find(
        accessibleBy(ability, 'update').ReferenceData
      )
        .where({ _id: args.id })
        .getFilter();
      const referenceData = await ReferenceData.findOneAndUpdate(
        filters,
        update,
        { new: true }
      );
      if (referenceData) {
        return referenceData;
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
