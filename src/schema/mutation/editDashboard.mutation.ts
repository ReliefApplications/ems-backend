import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { isEmpty } from 'lodash';
import { logger } from '@lib/logger';
import ButtonActionInputType from '@schema/inputs/button-action.input';
import StateInputType from '@schema/inputs/state.input';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { DashboardFilterInputType } from '@schema/inputs/dashboard-filter.input';

type DashboardButtonArgs = {
  text: string;
  href: string;
  variant: string;
  category: string;
  openInNewTab: boolean;
};

type DashboardFilterArgs = {
  variant?: string;
  show?: boolean;
  closable?: boolean;
  keepPrevious?: boolean;
  structure?: any;
  position?: string;
};

type DashboardStatesArgs = {
  name: string;
  id: string;
};

/** Arguments for the editDashboard mutation */
type EditDashboardArgs = {
  id: string | Types.ObjectId;
  structure?: any;
  states?: DashboardStatesArgs[];
  name?: string;
  buttons?: DashboardButtonArgs[];
  gridOptions?: any;
  filter?: DashboardFilterArgs;
};

/**
 * Find dashboard from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    structure: { type: GraphQLJSON },
    states: { type: new GraphQLList(StateInputType) },
    name: { type: GraphQLString },
    buttons: { type: new GraphQLList(ButtonActionInputType) },
    gridOptions: { type: GraphQLJSON },
    filter: { type: DashboardFilterInputType },
  },
  async resolve(parent, args: EditDashboardArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // check inputs
      if (!args || isEmpty(args)) {
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
        filter?: any;
        buttons?: any;
        gridOptions?: any;
      } = {};
      Object.assign(
        updateDashboard,
        args.structure && { structure: args.structure },
        args.states && { states: args.states },
        args.name && { name: args.name },
        args.filter && {
          filter: { ...dashboard.toObject().filter, ...args.filter },
        },
        args.buttons && { buttons: args.buttons },
        args.gridOptions && { gridOptions: args.gridOptions }
      );
      dashboard = await Dashboard.findByIdAndUpdate(args.id, updateDashboard, {
        new: true,
      });
      // update the related page or step
      const update = {
        modifiedAt: dashboard.modifiedAt,
        name: dashboard.name,
        gridOptions: dashboard.gridOptions,
      };
      await Page.findOneAndUpdate({ content: dashboard.id }, update);
      await Step.findOneAndUpdate({ content: dashboard.id }, update);
      return dashboard;
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
