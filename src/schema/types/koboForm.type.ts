import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from 'graphql';
import { ApiConfigurationType } from './apiConfiguration.type';
import { AppAbility } from '@security/defineUserAbility';
import { ApiConfiguration } from '@models';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL Kobo form type definition */
export const KoboFormType = new GraphQLObjectType({
  name: 'Geospatial',
  fields: () => ({
    id: { type: GraphQLString },
    deployedVersionId: { type: GraphQLString },
    dataFromDeployedVersion: { type: GraphQLBoolean },
    apiConfiguration: {
      type: ApiConfigurationType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const apiConfig = await ApiConfiguration.findOne({
          _id: parent.apiConfiguration,
          ...accessibleBy(ability, 'read').ApiConfiguration,
        });
        return apiConfig;
      },
    },
  }),
});
