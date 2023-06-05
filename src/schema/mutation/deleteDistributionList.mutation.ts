import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { DistributionListType } from '@schema/types/distributionList.type';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Mutation to delete distribution list.
 */
export default {
  type: DistributionListType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );
      if (ability.cannot('update', 'DistributionList')) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      const update = {
        $pull: { distributionLists: { _id: args.id } },
      };

      const application = await Application.findByIdAndUpdate(
        args.application,
        update
      );

      return application.distributionLists.find(
        (x) => x.id.toString() === args.id
      );
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
