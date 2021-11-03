import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLList, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { Application } from '../../models';
import { validateName } from '../../utils/validators';
import { AppAbility } from '../../security/defineAbilityFor';
import { StatusEnumType } from '../../const/enumTypes';

export default {
  /*  Finds application from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    description: { type: GraphQLString },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    pages: { type: new GraphQLList(GraphQLID) },
    settings: { type: GraphQLJSON },
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) { throw new GraphQLError(errors.userNotLogged); }
    const ability: AppAbility = context.user.ability;
    if (!args || (!args.name && !args.status && !args.pages && !args.settings && !args.permissions)) {
      throw new GraphQLError(errors.invalidEditApplicationArguments);
    }
    if (args.name) {
      validateName(args.name);
    }
    const filters = Application.accessibleBy(ability, 'update').where({ _id: args.id }).getFilter();
    let application = await Application.findOne(filters);
    if (!application) {
      throw new GraphQLError(errors.permissionNotGranted);
    }
    if (application.lockedBy && application.lockedBy.toString() !== user.id.toString()) {
      throw new GraphQLError('Please unlock application for edition.');
    }
    const update = {
      lockedBy: user.id,
    };
    Object.assign(update,
      args.name && { name: args.name },
      args.description && { description: args.description },
      args.status && { status: args.status },
      args.pages && { pages: args.pages },
      args.settings && { settings: args.settings },
      args.permissions && { permissions: args.permissions },
    );
    application = await Application.findOneAndUpdate(filters, update, { new: true });
    const publisher = await pubsub();
    publisher.publish('app_edited', {
      application,
      user: user.id,
    });
    publisher.publish('app_lock', {
      application,
      user: user.id,
    });
    return application;
  },
};
