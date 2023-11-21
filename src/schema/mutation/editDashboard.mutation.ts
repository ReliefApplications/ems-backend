import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { isEmpty, isNil } from 'lodash';
import { logger } from '@services/logger.service';
import ButtonActionInputType from '@schema/inputs/button-action.input';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

type DashboardButtonArgs = {
  text: string;
  href: string;
  variant: string;
  category: string;
  openInNewTab: boolean;
};

/** Arguments for the editDashboard mutation */
type EditDashboardArgs = {
  id: string | Types.ObjectId;
  structure?: any;
  name?: string;
  showFilter?: boolean;
  buttons?: DashboardButtonArgs[];
  gridOptions?: any;
  filterVariant?: string;
  closable?: boolean;
  contextualFilter?: any;
  contextualFilterPosition?: string;
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
    name: { type: GraphQLString },
    showFilter: { type: GraphQLBoolean },
    buttons: { type: new GraphQLList(ButtonActionInputType) },
    gridOptions: { type: GraphQLJSON },
    filterVariant: { type: GraphQLString },
    closable: { type: GraphQLBoolean },
    contextualFilter: { type: GraphQLJSON },
    contextualFilterPosition: { type: GraphQLString },
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
        showFilter?: boolean;
        filterVariant?: string;
        closable?: boolean;
      } = {};
      Object.assign(
        updateDashboard,
        args.structure && { structure: args.structure },
        args.name && { name: args.name },
        !isNil(args.showFilter) && { showFilter: args.showFilter },
        args.buttons && { buttons: args.buttons },
        args.gridOptions && { gridOptions: args.gridOptions },
        args.filterVariant && { filterVariant: args.filterVariant },
        !isNil(args.closable) && { closable: args.closable },
        args.contextualFilter && { contextualFilter: args.contextualFilter },
        args.contextualFilterPosition && {
          contextualFilterPosition: args.contextualFilterPosition,
        }
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
