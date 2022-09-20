import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLInt,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '../../models';
import extendAbilityForContent from '../../security/extendAbilityForContent';

/**
 * Find dashboard from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    widget: { type: GraphQLJSON },
    name: { type: GraphQLString },
    action: { type: GraphQLString },
    widget_id: { type: GraphQLID },
    new_index: { type: GraphQLInt },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    // check inputs
    if (!args || (!args.name && !args.action)) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditDashboardArguments')
      );
    }
    // get data
    let dashboard = await Dashboard.findById(args.id);
    // check permissions
    const ability = await extendAbilityForContent(user, dashboard);
    if (ability.cannot('update', dashboard)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const updateDashboard: {
      //modifiedAt?: Date;
      name?: string;
    } = {};
    Object.assign(updateDashboard, args.name && { name: args.name });

    switch (args.action) {
      //add new widget data
      case 'add': {
        if (!args.widget) {
          throw new GraphQLError(
            context.i18next.t('errors.invalidEditDashboardAddWidgetArguments')
          );
        }
        dashboard.structure.push(args.widget);
        Object.assign(
          updateDashboard,
          args.widget && { widget: dashboard.structure }
        );
        break;
      }
      //update specific widget data
      case 'update': {
        if (!args.widget || !args.widget_id) {
          throw new GraphQLError(
            context.i18next.t(
              'errors.invalidEditDashboardUpdateWidgetArguments'
            )
          );
        }
        await Dashboard.findOneAndUpdate(
          { _id: args.id, 'widget._id': args.widget_id },
          {
            $set: {
              'widget.$.name': args.widget.name,
              'widget.$.settings': args.widget.settings,
              'widget.$.defaultCols': args.widget.defaultCols,
              'widget.$.defaultRows': args.widget.defaultRows,
              'widget.$.type': args.widget.type,
            },
          }
        );
        break;
      }
      //delete specific widget
      case 'delete': {
        if (!args.widget_id) {
          throw new GraphQLError(
            context.i18next.t(
              'errors.invalidEditDashboardDeleteWidgetArguments'
            )
          );
        }
        dashboard.structure.id(args.widget_id).remove();
        Object.assign(
          updateDashboard,
          dashboard.structure && { structure: dashboard.structure }
        );
        break;
      }
      //change widget order
      case 'move': {
        if (!args.widget_id || isNaN(args.new_index)) {
          throw new GraphQLError(
            context.i18next.t('errors.invalidEditDashboardMoveWidgetArguments')
          );
        }
        const fromIndex = dashboard.structure.findIndex(
          (widgetData) => widgetData._id == args.widget_id
        );
        const widgetElement = dashboard.structure[fromIndex];
        dashboard.structure.splice(fromIndex, 1);
        dashboard.structure.splice(args.new_index, 0, widgetElement);
        Object.assign(
          updateDashboard,
          dashboard.structure && { widget: dashboard.structure }
        );
        break;
      }
      default: {
        break;
      }
    }

    // do the update on dashboard
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
