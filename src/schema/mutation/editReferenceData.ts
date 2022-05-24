import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import { ReferenceData } from '../../models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceDataTypeEnumType } from '../../const/enumTypes';

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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    if (
      !args.name &&
      !args.type &&
      !args.apiConfiguration &&
      !args.query &&
      !args.fields &&
      !args.valueField &&
      !args.path &&
      !args.data &&
      !args.graphQLFilter &&
      !args.permissions
    ) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditReferenceDataArguments')
      );
    }
    const update = {};
    Object.assign(
      update,
      args.name && { name: args.name },
      args.type && { type: args.type },
      args.apiConfiguration && { apiConfiguration: args.apiConfiguration },
      args.query && { query: args.query },
      args.fields && { fields: args.fields },
      args.valueField && { valueField: args.valueField },
      args.path && { path: args.path },
      args.data && { data: args.data },
      args.graphQLFilter && { graphQLFilter: args.graphQLFilter },
      args.permissions && { permissions: args.permissions }
    );
    const filters = ReferenceData.accessibleBy(ability, 'update')
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
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
  },
};
