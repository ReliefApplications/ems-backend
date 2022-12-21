import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';

/**
 * Find dashboard from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
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
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // check inputs
    if (!args || (!args.name && !args.structure)) {
      throw new GraphQLError(
        context.i18next.t('mutations.dashboard.edit.errors.invalidArguments')
      );
    }
    // get data
    let dashboard = await Dashboard.findById(args.id);
    // check permissions
    const ability = await extendAbilityForContent(user, dashboard);
    if (ability.cannot('update', dashboard)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    // do the update on dashboard
    const updateDashboard: {
      //modifiedAt?: Date;
      structure?: any;
      name?: string;
    } = {};
    Object.assign(
      updateDashboard,
      args.structure && { structure: args.structure },
      args.name && { name: args.name }
    );
    dashboard = await Dashboard.findByIdAndUpdate(args.id, updateDashboard, {
      new: true,
    });
    // update the related page or step
    const update = {
      modifiedAt: dashboard.modifiedAt,
      name: dashboard.name,
    };
    await Page.findOneAndUpdate({ content: dashboard.id }, update);
    await Step.findOneAndUpdate({ content: dashboard.id }, update);
    return dashboard;
  },
};
