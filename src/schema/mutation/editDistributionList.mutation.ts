import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { DistributionListType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import {
  DistributionListArgs,
  DistributionListInputType,
} from '@schema/inputs/distributionList.input';
import { validateEmail } from '@utils/validators';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editDistributionList mutation */
type EditDistributionListArgs = {
  id: string | Types.ObjectId;
  application: string;
  distributionList: DistributionListArgs;
};

/**
 * Mutation to edit distribution list.
 */
export default {
  type: DistributionListType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
    distributionList: { type: new GraphQLNonNull(DistributionListInputType) },
  },
  async resolve(_, args: EditDistributionListArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );
      if (ability.cannot('update', 'DistributionList')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // Prevent wrong emails to be saved
      if (
        args.distributionList.emails.filter((x) => !validateEmail(x)).length > 0
      ) {
        throw new GraphQLError(
          context.i18next.t('common.errors.invalidEmailsInput')
        );
      }

      const update = {
        $set: {
          'distributionLists.$.name': args.distributionList.name,
          'distributionLists.$.emails': args.distributionList.emails,
        },
      };

      const application = await Application.findOneAndUpdate(
        { _id: args.application, 'distributionLists._id': args.id },
        update,
        { new: true }
      );

      return application.distributionLists.find(
        (distributionList) => distributionList.id.toString() === args.id
      );
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
