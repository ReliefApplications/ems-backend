import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { StatusEnumType, StatusType } from '@const/enumTypes';
import { isEmpty, isNil } from 'lodash';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editApplication mutation */
type EditApplicationArgs = {
  id: string | Types.ObjectId;
  description?: string;
  sideMenu?: boolean;
  hideMenu?: boolean;
  name?: string;
  status?: StatusType;
  pages?: string[] | Types.ObjectId[];
  settings?: any;
  permissions?: any;
};

/**
 * Find application from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    description: { type: GraphQLString },
    sideMenu: { type: GraphQLBoolean },
    hideMenu: { type: GraphQLBoolean },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    pages: { type: new GraphQLList(GraphQLID) },
    settings: { type: GraphQLJSON },
    permissions: { type: GraphQLJSON },
  },
  async resolve(parent, args: EditApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = context.user.ability;
      // Check that args were provided and object is not empty
      if (!args || isEmpty(args)) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.application.duplicate.errors.invalidArguments'
          )
        );
      }
      const filters = Application.find(
        accessibleBy(ability, 'update').Application
      )
        .where({ _id: args.id })
        .getFilter();
      let application = await Application.findOne(filters);
      if (!application) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      if (
        application.lockedBy &&
        application.lockedBy.toString() !== user._id.toString()
      ) {
        throw new GraphQLError('Please unlock application for edition.');
      }
      const update = {
        // lockedBy: user._id,
      };
      Object.assign(
        update,
        args.name && { name: args.name },
        args.description && { description: args.description },
        args.status && { status: args.status },
        args.pages && { pages: args.pages },
        args.settings && { settings: args.settings },
        args.permissions && { permissions: args.permissions },
        !isNil(args.sideMenu) && { sideMenu: args.sideMenu },
        !isNil(args.hideMenu) && { hideMenu: args.hideMenu }
      );
      application = await Application.findOneAndUpdate(filters, update, {
        new: true,
      });
      const publisher = await pubsub();
      publisher.publish('app_edited', {
        application,
        user: user._id,
      });
      publisher.publish('app_lock', {
        application,
        user: user._id,
      });
      return application;
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
