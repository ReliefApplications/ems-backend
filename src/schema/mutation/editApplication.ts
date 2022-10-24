import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { Application } from '../../models';
import { validateName } from '../../utils/validators';
import { AppAbility } from '../../security/defineAbilityFor';
import { StatusEnumType } from '../../const/enumTypes';
import { Types } from 'mongoose';

/** Type for the template changes argument */
type TemplateChange = {
  add?: {
    name: string;
    type: 'email';
    content: {
      [key: string]: string;
    };
  };
  remove?: { id: string };
  update?: {
    id: string;
    name: string;
    content: {
      [key: string]: string;
    };
  };
};

/**
 * Finds application from its id and update it, if user is authorized.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    description: { type: GraphQLString },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    pages: { type: new GraphQLList(GraphQLID) },
    settings: { type: GraphQLJSON },
    permissions: { type: GraphQLJSON },
    templates: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = context.user.ability;
    if (
      !args ||
      (!args.name &&
        !args.status &&
        !args.pages &&
        !args.settings &&
        !args.permissions &&
        !args.templates)
    ) {
      throw new GraphQLError(errors.invalidEditApplicationArguments);
    }
    if (args.name) {
      validateName(args.name);
    }
    const filters = Application.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    let application = await Application.findOne(filters);
    if (!application) {
      throw new GraphQLError(errors.permissionNotGranted);
    }
    if (
      application.lockedBy &&
      application.lockedBy.toString() !== user.id.toString()
    ) {
      throw new GraphQLError('Please unlock application for edition.');
    }
    const update = {
      lockedBy: user.id,
    };
    Object.assign(
      update,
      args.name && { name: args.name },
      args.description && { description: args.description },
      args.status && { status: args.status },
      args.pages && { pages: args.pages },
      args.settings && { settings: args.settings },
      args.permissions && { permissions: args.permissions }
    );

    const arrayFilters: any[] = [];
    if (args.templates) {
      const change: TemplateChange = args.templates;

      // add new template
      if (change.add) {
        const pushTemplate = {
          templates: {
            name: change.add.name,
            type: change.add.type,
            content: change.add.content,
          },
        };
        Object.assign(update, { $addToSet: pushTemplate });
      }

      // remove template
      if (change.remove) {
        Object.assign(update, {
          $pull: { templates: { _id: change.remove.id } },
        });
      }

      // update template
      if (change.update) {
        const updateTemplate = {
          'templates.$[element].name': change.update.name,
          'templates.$[element].content': change.update.content,
        };

        Object.assign(update, { $set: updateTemplate });
        arrayFilters.push({
          'element._id': new Types.ObjectId(change.update.id),
        });
      }
    }

    application = await Application.findOneAndUpdate(filters, update, {
      new: true,
      arrayFilters,
    });
    // const publisher = await pubsub();
    // publisher.publish('app_edited', {
    //   application,
    //   user: user.id,
    // });
    // publisher.publish('app_lock', {
    //   application,
    //   user: user.id,
    // });
    return application;
  },
};
