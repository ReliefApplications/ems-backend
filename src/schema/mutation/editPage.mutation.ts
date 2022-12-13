import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { contentType } from '@const/enumTypes';
import { PageType } from '../types';
import { Page, Workflow, Dashboard, Form } from '@models';
import { isArray } from 'lodash';
import extendAbilityForPage from '@security/extendAbilityForPage';

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
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // check inputs
    if (!args || (!args.name && !args.permissions))
      throw new GraphQLError(
        context.i18next.t('mutations.page.edit.errors.invalidArguments')
      );
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

    // update name
    /* const update: {
      modifiedAt?: Date;
      name?: string;
    } = {
      modifiedAt: new Date(),
    }; */

    const update: {
      name?: string;
    } = {};

    Object.assign(update, args.name && { name: args.name });

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
  },
};
