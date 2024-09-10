import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteResource mutation */
type DeleteResourceArgs = {
  id: string | Types.ObjectId;
};

/**
 * Delete a resource from its id.
 * Throw GraphQL error if not logged or authorized.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteResourceArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      const ability: AppAbility = user.ability;
      const filters = Resource.find(accessibleBy(ability, 'delete').Resource)
        .where({ _id: args.id })
        .getFilter();
      const deletedResource = await Resource.findOneAndDelete(filters);

      /// Resource is not deleted, user does not have permission to do the deletion
      if (!deletedResource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return deletedResource;
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
