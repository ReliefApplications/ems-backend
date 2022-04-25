import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Step, Workflow } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
  /*  Returns step from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: StepType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const step = await Step.findOne(
      Step.accessibleBy(ability).where({ _id: args.id }).getFilter()
    );
    if (!step) {
      // If user is admin and can see parent application, it has access to it
      if (user.isAdmin) {
        const workflow = await Workflow.findOne({ steps: args.id }, 'id');
        if (
          workflow &&
          (await canAccessContent(workflow.id, 'read', ability))
        ) {
          return Step.findById(args.id);
        }
      }
    } else {
      return step;
    }
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
