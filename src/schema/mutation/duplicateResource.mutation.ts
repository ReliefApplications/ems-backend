import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * Delete a resource from its id.
 * Throw GraphQL error if not logged or authorized.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = user.ability;
      const filters = Resource.find(accessibleBy(ability, 'create').Resource)
        .where({ _id: args.id })
        .getFilter();

      // const deletedResource = await Resource.findOneAndDelete(filters);
      const findedResource = await Resource.findOne(filters);
      console.log('findResource', findedResource);

      // Duplica o resource com novos ids
      const duplicatedResource = await Resource.create({
        name: findedResource.name + ' - copy',
        permissions: findedResource.permissions,
        fields: findedResource.fields,
        layouts: findedResource.layouts,
        aggregations: findedResource.aggregations,
      });

      // Resource is not duplicated, user does not have permission to do the create resource
      if (!duplicatedResource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return duplicatedResource;
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
