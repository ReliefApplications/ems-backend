import mongoose from 'mongoose';
import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { contentType } from '../../const/enumTypes';
import { PageType } from '../types';
import { Page, Workflow, Dashboard, Form, Application } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import { isArray } from 'lodash';

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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (!args || (!args.name && !args.permissions))
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditPageArguments')
      );

    const update: {
      modifiedAt?: Date;
      name?: string;
    } = {
      modifiedAt: new Date(),
    };

    Object.assign(update, args.name && { name: args.name });

    const permissionsUpdate: any = {};
    // Updating permissions
    if (args.permissions) {
      const permissions: PermissionChange = args.permissions;
      for (const permission in permissions) {
        if (isArray(permissions[permission])) {
          // if it's an array, replace the old value with the provided list
          permissionsUpdate['permissions.' + permission] =
            permissions[permission];
        } else {
          const obj = permissions[permission];
          if (obj.add && obj.add.length) {
            const pushRoles = {
              [`permissions.${permission}`]: { $each: obj.add },
            };

            if (permissionsUpdate.$push)
              Object.assign(permissionsUpdate.$push, pushRoles);
            else Object.assign(permissionsUpdate, { $push: pushRoles });
          }
          if (obj.remove && obj.remove.length) {
            const pullRoles = {
              [`permissions.${permission}`]: {
                $in: obj.remove.map(
                  (role: any) => new mongoose.Types.ObjectId(role)
                ),
              },
            };

            if (permissionsUpdate.$pull)
              Object.assign(permissionsUpdate.$pull, pullRoles);
            else Object.assign(permissionsUpdate, { $pull: pullRoles });
          }
        }
      }
    }

    const filters = Page.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    let page = await Page.findOneAndUpdate(
      filters,
      { ...update, ...permissionsUpdate },
      { new: true }
    );
    if (!page) {
      if (user.isAdmin) {
        const application = Application.findOne(
          Application.accessibleBy(ability, 'update')
            .where({ pages: args.id })
            .getFilter(),
          'id permissions'
        );
        if (application) {
          page = await Page.findByIdAndUpdate(args.id, update, { new: true });
        }
      }
    }
    if (!page)
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
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
