import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Workflow, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
  /*  Delete a step from its id and erase its reference in the corresponding workflow.
        Delete also the linked dashboard if it has one.
        Throws an error if not logged or authorized, or arguments are invalid.
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
    const filters = Step.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    let step = await Step.findOneAndDelete(filters);
    if (!step) {
      const workflow = await Workflow.findOne({ steps: args.id }, 'id');
      if (!workflow)
        throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
      if (
        user.isAdmin &&
        (await canAccessContent(workflow.id, 'delete', ability))
      ) {
        step = await Step.findByIdAndDelete(args.id);
      } else {
        throw new GraphQLError(
          context.i18next.t('errors.permissionNotGranted')
        );
      }
    }
    return step;
  },
};
