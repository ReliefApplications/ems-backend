import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import { Form, ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceDataTypeEnumType } from '@const/enumTypes';
import { buildTypes } from '@utils/schema';
import {
  validateGraphQLFieldName,
  validateGraphQLTypeName,
} from '@utils/validators';

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
    fields: { type: new GraphQLList(GraphQLString) },
    valueField: { type: GraphQLString },
    path: { type: GraphQLString },
    data: { type: GraphQLJSON },
    graphQLFilter: { type: GraphQLString },
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    // Build update
    const update = {
      //modifiedAt: new Date(),
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
          context.i18next.t('mutations.reference.edit.errors.formResDuplicated')
        );
      }
      update.graphQLTypeName = ReferenceData.getGraphQLTypeName(args.name);
    }
    if (update.fields) {
      // Check fields
      for (const field of update.fields) {
        validateGraphQLFieldName(field, context.i18next);
      }
    }
    // We need at least one field in order to update the api reference data
    if (Object.keys(update).length < 1) {
      throw new GraphQLError(
        context.i18next.t('mutations.reference.edit.errors.invalidArguments')
      );
    }
    const filters = ReferenceData.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    const referenceData = await ReferenceData.findOneAndUpdate(
      filters,
      update,
      { new: true }
    );
    if (referenceData) {
      buildTypes();
      return referenceData;
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
