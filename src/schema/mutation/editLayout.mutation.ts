import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource, Form, Dashboard } from '@models';
import { LayoutType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import LayoutInputType from '../../schema/inputs/layout.input';
// import { logger } from '@services/logger.service';

/**
 * Edits an existing layout.
 */
export default {
  type: LayoutType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    layout: { type: new GraphQLNonNull(LayoutInputType) },
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    // try {
    if (args.form && args.resource) {
      throw new GraphQLError(
        context.i18next.t(
          'mutations.layout.edit.errors.invalidAddPageArguments'
        )
      );
    }
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    // Edition of a resource
    if (args.resource) {
      //get resource layout data
      const resourceData = await Resource.findOne({
        layouts: {
          $elemMatch: { _id: args.id },
        },
      });

      if (!args.forceFullyUpdateFields) {
        args.forceFullyUpdateFields = false;
      }

      //check layout data available or not and check forcefully update this layout fields..
      if (
        !!resourceData &&
        !!resourceData.layouts &&
        args.forceFullyUpdateFields == false
      ) {
        //get widget data
        const widgetData = await Dashboard.find({
          $and: [
            {
              structure: {
                $elemMatch: {
                  'settings.resource': resourceData._id.toString(),
                },
              },
            },
            {
              structure: {
                $elemMatch: { 'settings.layouts': args.id.toString() },
              },
            },
          ],
        });

        if (!!widgetData) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.layout.edit.errors.alreadyUseLayoutField',
              {
                name: 'widget',
              }
            )
          );
        }
      }
      const filters = Resource.accessibleBy(ability, 'update')
        .where({ _id: args.resource })
        .getFilter();
      const resource: Resource = await Resource.findOne(filters);
      if (!resource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      resource.layouts.id(args.id).name = args.layout.name;
      resource.layouts.id(args.id).query = args.layout.query;
      resource.layouts.id(args.id).display = args.layout.display;
      await resource.save();
      return resource.layouts.id(args.id);
    } else {
      // Edition of a Form
      const filters = Form.accessibleBy(ability, 'update')
        .where({ _id: args.form })
        .getFilter();
      const form: Form = await Form.findOne(filters);
      if (!form) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      form.layouts.id(args.id).name = args.layout.name;
      form.layouts.id(args.id).query = args.layout.query;
      form.layouts.id(args.id).display = args.layout.display;
      await form.save();
      return form.layouts.id(args.id);
    }
    // } catch (err) {
    //   logger.error(err.message, { stack: err.stack });
    //   throw new GraphQLError(
    //     context.i18next.t('common.errors.internalServerError')
    //   );
    // }
  },
};
