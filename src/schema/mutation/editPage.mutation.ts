import { contentType } from '@const/enumTypes';
import { Button, Dashboard, Form, Page, Workflow } from '@models';
import ActionButtonInputType from '@schema/inputs/button-action.input';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { cloneDeep, has, isArray, isEmpty, isNil, omit } from 'lodash';
import { Types } from 'mongoose';
import { PageType } from '../types';

/** Simple form permission change type */
type SimplePermissionChange =
  | {
      add?: string[];
      remove?: string[];
    }
  | string[];

/** Type for the permission argument */
type PermissionChange = {
  canSee?: SimplePermissionChange;
  canUpdate?: SimplePermissionChange;
  canDelete?: SimplePermissionChange;
};

/** Arguments for the editPage mutation */
type EditPageArgs = {
  id: string | Types.ObjectId;
  name?: string;
  showName?: boolean;
  permissions?: any;
  icon?: string;
  visible?: boolean;
  buttons?: Button[];
};

/**
 *  Finds a page from its id and update it, if user is authorized.
 *    Update also the name and permissions of the linked content if it's not a form.
 *    Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    showName: { type: GraphQLBoolean },
    icon: { type: GraphQLString },
    permissions: { type: GraphQLJSON },
    visible: { type: GraphQLBoolean },
    buttons: { type: new GraphQLList(ActionButtonInputType) },
  },
  async resolve(parent, args: EditPageArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      /**
       * Check if at least one of the required arguments is provided.
       * Else, send error.
       * This way, we check for the existence of keys, except id in args
       */
      if (isEmpty(cloneDeep(omit(args, ['id'])))) {
        throw new GraphQLError(
          context.i18next.t('mutations.page.edit.errors.invalidArguments')
        );
      }

      // get data
      let page = await Page.findById(args.id);
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // check permission
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('update', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Create update
      const update = {
        ...(args.name && { name: args.name }),
        ...(args.icon && { icon: args.icon }),
        ...(has(args, 'showName') && { showName: args.showName }),
      } as any;
      // Update buttons
      if (args.buttons) {
        update.buttons = args.buttons;
      }
      // Updating permissions
      const permissionsUpdate: any = {};
      if (args.permissions) {
        const permissions: PermissionChange = args.permissions;
        for (const [key, obj] of Object.entries(permissions)) {
          if (isArray(obj)) {
            // if it's an array, replace the old value with the provided list
            permissionsUpdate['permissions.' + key] = obj;
          } else {
            // else it's an object with "add" and "remove" keys
            if (obj.add && obj.add.length) {
              const pushRoles = {
                [`permissions.${key}`]: { $each: obj.add },
              };
              if (permissionsUpdate.$push) {
                Object.assign(permissionsUpdate.$push, pushRoles);
              } else {
                Object.assign(permissionsUpdate, { $push: pushRoles });
              }
            }
            if (obj.remove && obj.remove.length) {
              const pullRoles = {
                [`permissions.${key}`]: { $in: obj.remove },
              };
              if (permissionsUpdate.$pull) {
                Object.assign(permissionsUpdate.$pull, pullRoles);
              } else {
                Object.assign(permissionsUpdate, { $pull: pullRoles });
              }
            }
          }
        }
      }

      // Update visibility
      Object.assign(update, !isNil(args.visible) && { visible: args.visible });

      // apply the update
      page = await Page.findByIdAndUpdate(
        page._id,
        { ...update, ...permissionsUpdate },
        { new: true }
      );

      // update the content
      switch (page.type) {
        case contentType.workflow:
          await Workflow.findByIdAndUpdate(page.content, update);
          break;
        case contentType.dashboard:
          await Dashboard.findByIdAndUpdate(page.content, update);
          break;
        case contentType.form:
          if (update.name) delete update.name;
          await Form.findByIdAndUpdate(page.content, update);
          break;
        default:
          break;
      }
      return page;
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
