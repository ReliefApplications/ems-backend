import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
  /*  Finds dashboard from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    structure: { type: GraphQLJSON },
    name: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (!args || (!args.name && !args.structure)) {
      throw new GraphQLError(context.i18next.t('errors.invalidEditDashboardArguments'));
    }
    let canUpdate = ability.can('update', 'Dashboard');
    if (!canUpdate) {
      if (user.isAdmin) {
        canUpdate = await canAccessContent(args.id, 'update', ability);
      }
      if (!canUpdate) {
        const filtersPage = Page.accessibleBy(ability, 'update')
          .where({ content: args.id })
          .getFilter();
        const filtersStep = Step.accessibleBy(ability, 'update')
          .where({ content: args.id })
          .getFilter();
        const page = await Page.findOne(filtersPage);
        const step = await Step.findOne(filtersStep);
        canUpdate = Boolean(page || step);
      }
    }
    if (!canUpdate) throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    const updateDashboard: {
      modifiedAt?: Date;
      structure?: any;
      name?: string;
    } = {
      modifiedAt: new Date(),
    };
    Object.assign(
      updateDashboard,
      args.structure && { structure: args.structure },
      args.name && { name: args.name }
    );
    const dashboard = await Dashboard.findByIdAndUpdate(
      args.id,
      updateDashboard,
      { new: true }
    );
    const update = {
      modifiedAt: dashboard.modifiedAt,
      name: dashboard.name,
    };
    await Page.findOneAndUpdate({ content: dashboard.id }, update);
    await Step.findOneAndUpdate({ content: dashboard.id }, update);
    return dashboard;
  },
};
