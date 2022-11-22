import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { DistributionListType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import DistributionListInputType from 'schema/inputs/distributionList.input';

/**
 * Mutation to add a new distribution list.
 */
export default {
  type: DistributionListType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    distributionList: { type: new GraphQLNonNull(DistributionListInputType) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = extendAbilityForApplications(
      user,
      args.application
    );
    if (ability.cannot('update', 'DistributionList')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const update = {
      $addToSet: {
        distributionLists: {
          name: args.distributionList.name,
          emails: args.distributionList.emails,
        },
      },
    };

    const application = await Application.findByIdAndUpdate(
      args.application,
      update,
      { new: true }
    );

    return application.distributionLists.pop();
  },
};
