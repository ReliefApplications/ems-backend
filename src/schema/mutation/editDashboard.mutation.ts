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
import { isEmpty, isEqual } from 'lodash';
import { logger } from '@services/logger.service';
import ButtonActionInputType from '@schema/inputs/button-action.input';
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
  structure?: any;
  position?: string;
};

/** Arguments for the editDashboard mutation */
type EditDashboardArgs = {
  id: string | Types.ObjectId;
  structure?: any;
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
      // Has the ids of the widgets that have been deleted from the dashboard
      const removedWidgets: string[] = (dashboard.structure || [])
        .filter(
          (w: any) =>
            !(args.structure || []).find((widget) => widget.id === w.id)
        )
        .map((w) => w.id);

      // Gets the page that contains the dashboard
      const page = await Page.findOne({
        $or: [
          {
            contentWithContext: {
              $elemMatch: {
                content: dashboard.id,
              },
            },
          },
          { content: dashboard.id },
        ],
      });

      // If editing a template, the content would be in the contentWithContext array
      // otherwise, it would be in the content field
      const isEditingTemplate = page.content.toString() !== args.id.toString();

      // If editing a template, we mark the widgets that changed as modified
      // to prevent them from being updated when the main dashboard is updated
      if (isEditingTemplate) {
        args.structure.forEach((widget: any) => {
          // Get the old widget by id
          const oldWidget = dashboard.structure.find(
            (w: any) => w.id === widget.id
          );

          if (!widget.modified) {
            widget.modified = !isEqual(oldWidget?.settings, widget.settings);
          }
        });
      } else {
        // If editing the main dashboard, we update all the templates that inherit from it
        const templateDashboards = await Dashboard.find({
          _id: {
            $in: page.contentWithContext.map((cc) => cc.content),
          },
        });

        templateDashboards.forEach((template) => {
          if (
            !Array.isArray(template.structure) ||
            !Array.isArray(args.structure)
          ) {
            return;
          }
          args.structure.forEach((widget) => {
            const widgetIdx = template.structure.findIndex(
              (w) => w.id === widget.id
            );

            const templateWidget =
              widgetIdx !== -1 ? template.structure[widgetIdx] : null;

            // If not found, it means the widget was just added to the main dashboard
            // We should also add it to the template
            if (
              !templateWidget &&
              !template.deletedWidgets.includes(widget.id)
            ) {
              template.structure.push(widget);
              template.markModified('structure');
              return;
            } else if (!templateWidget) {
              return;
            }

            // Only update widgets that haven't been modified from the template
            if (!templateWidget.modified) {
              template.structure[widgetIdx] = widget;
              template.markModified('structure');
            }
          });

          // Remove widgets that were removed from the main dashboard, if not modified
          removedWidgets.forEach((id) => {
            const widgetIdx = template.structure.findIndex((w) => w.id === id);
            if (widgetIdx !== -1 && !template.structure[widgetIdx].modified) {
              template.structure.splice(widgetIdx, 1);
              template.markModified('structure');
            }
          });
        });

        // Save the templates
        await Dashboard.bulkSave(templateDashboards);
      }

      // update the deletedWidgets array with the id of the widgets that have been just removed
      const updatedDeletedWidgets = [
        ...new Set([...dashboard.deletedWidgets, ...removedWidgets]),
      ];

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
        args.name && { name: args.name },
        args.filter && {
          filter: { ...dashboard.toObject().filter, ...args.filter },
        },
        args.buttons && { buttons: args.buttons },
        args.gridOptions && { gridOptions: args.gridOptions },
        isEditingTemplate && { deletedWidgets: updatedDeletedWidgets }
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
