import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLError,
} from 'graphql';
import { WorkflowType } from '../types';
import { Workflow, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

/**
 * Find a workflow from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: WorkflowType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    steps: { type: new GraphQLList(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (!args || (!args.name && !args.steps)) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditWorkflowArguments')
      );
    }
    let update = {
      modifiedAt: new Date(),
    };
    Object.assign(
      update,
      args.name && { name: args.name },
      args.steps && { steps: args.steps }
    );
    if (ability.can('update', 'Workflow')) {
      return Workflow.findByIdAndUpdate(args.id, update, { new: true });
    } else {
      if (user.isAdmin) {
        if (await canAccessContent(args.id, 'update', ability)) {
          return Workflow.findByIdAndUpdate(args.id, update, { new: true });
        }
      } else {
        const filtersPage = Page.accessibleBy(ability, 'update')
          .where({ content: args.id })
          .getFilter();
        const filtersStep = Step.accessibleBy(ability, 'update')
          .where({ content: args.id })
          .getFilter();
        update = {
          modifiedAt: new Date(),
        };
        Object.assign(update, args.name && { name: args.name });
        const page = await Page.findOneAndUpdate(filtersPage, update);
        const step = await Step.findOneAndUpdate(filtersStep, update);
        if (page || step) {
          Object.assign(update, args.steps && { steps: args.steps });
          return Workflow.findByIdAndUpdate(args.id, update, { new: true });
        }
      }
    }
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
